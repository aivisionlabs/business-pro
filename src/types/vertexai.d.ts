// Minimal ambient types to satisfy the compiler for @google-cloud/vertexai
declare module "@google-cloud/vertexai" {
  export class VertexAI {
    constructor(opts: { project: string; location: string });
    getGenerativeModel(opts: { model: string }): {
      startChat(config: unknown): {
        sendMessage(input: unknown): Promise<{ response: unknown }>;
      };
    };
  }
}



