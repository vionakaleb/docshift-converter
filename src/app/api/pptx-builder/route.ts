import { NextRequest, NextResponse } from "next/server";
import { runInNewContext } from "vm";
import pptxgen from "pptxgenjs";

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();

    if (!script || typeof script !== "string") {
      return NextResponse.json(
        { error: "Script is required and must be a string" },
        { status: 400 },
      );
    }

    // Create a sandboxed context
    const context: any = {
      pptxgen, // direct reference for style A
      console,
      // Custom require – only allows 'pptxgenjs'
      require: (module: string) => {
        if (module === "pptxgenjs") {
          return pptxgen;
        }
        throw new Error(
          `Module "${module}" is not allowed. Only "pptxgenjs" is supported.`,
        );
      },
      // Capture the result
      pres: null,
      buildPresentation: null,
    };

    // Execute the script with a timeout
    const code = `
      ${script}
      // After script execution, define the pres or buildPresentation
    `;
    runInNewContext(code, context, { timeout: 30000 });

    // Determine which result to use
    let pres = null;

    if (typeof context.buildPresentation === "function") {
      // Style A – call the function
      const result = context.buildPresentation(pptxgen);
      if (result && typeof result.write === "function") {
        pres = result;
      }
    } else if (context.pres && typeof context.pres.write === "function") {
      // Style B – use the global pres variable
      pres = context.pres;
    }

    if (!pres) {
      return NextResponse.json(
        {
          error:
            'No presentation found. Please define either a function buildPresentation(pptxgen) that returns the presentation, or a variable "pres" created with new pptxgen().',
        },
        { status: 400 },
      );
    }

    // Generate the PPTX file
    const buffer = await pres.write({ outputType: "nodebuffer" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="presentation.pptx"',
      },
    });
  } catch (error: any) {
    console.error("PPTX generation error:", error);
    // Provide a clearer message if 'require' was used improperly
    let message = error.message || "Failed to generate PPTX";
    if (error.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
      message = "Script execution timed out (30 seconds).";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
