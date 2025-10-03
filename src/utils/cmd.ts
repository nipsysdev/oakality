async function isToolAvailable(command: string): Promise<boolean> {
  try {
    const process = new Deno.Command(command, {
      args: ["--help"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await process.output();
    return success;
  } catch {
    return false;
  }
}

export async function ensureToolsArePresent(tools: string[]): Promise<void> {
  const missingTools: string[] = [];
  await Promise.all(
    tools.map((tool) =>
      isToolAvailable(tool).then((present) => {
        if (!present) {
          missingTools.push(tool);
        }
      })
    ),
  );

  if (missingTools.length) {
    console.error(
      `Error: Missing required tool(s): ${missingTools.join(", ")}`,
    );
    console.error("Please install the missing tool(s) and try again.");
    Deno.exit(1);
  }
}
