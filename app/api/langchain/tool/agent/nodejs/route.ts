// app\api\langchain\tool\agent\nodejs\route.ts

import { NextRequest, NextResponse } from "next/server";
import { AgentApi, RequestBody, ResponseBody } from "../agentapi";
import { auth } from "@/app/api/auth";
import { NodeJSTool } from "@/app/api/langchain-tools/nodejs_tools";
import { ModelProvider } from "@/app/constant";
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Embeddings } from "langchain/dist/embeddings/base";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { Post2WordPressTool } from "@/app/api/langchain-tools/post2wordpress"; // Import the new tool
export const maxDuration = 60; // This function can run for a maximum of 5 seconds
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }
  try {
    const authResult = auth(req, ModelProvider.GPT);
    if (authResult.error) {
      return NextResponse.json(authResult, {
        status: 401,
      });
    }

    const encoder = new TextEncoder();
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const controller = new AbortController();
    const agentApi = new AgentApi(encoder, transformStream, writer, controller);
    console.log("Start handling request...");

    const reqBody: RequestBody = await req.json();
    console.log("Request body parsed:", reqBody);

    const authToken = req.headers.get("Authorization") ?? "";
    const token = authToken.trim().replaceAll("Bearer ", "").trim();
    console.log("Authorization token processed.");

    const apiKey = await agentApi.getOpenAIApiKey(token);
    console.log("OpenAI API key retrieved.");

    const baseUrl = await agentApi.getOpenAIBaseUrl(reqBody.baseUrl);
    console.log("OpenAI base URL:", baseUrl);

    const model = new OpenAI(
      {
        temperature: 0,
        modelName: reqBody.model,
        openAIApiKey: apiKey,
      },
      { basePath: baseUrl },
    );
    const embeddings = new OpenAIEmbeddings(
      {
        openAIApiKey: apiKey,
      },
      { basePath: baseUrl },
    );
    let ragEmbeddings: Embeddings;
    if (process.env.OLLAMA_BASE_URL) {
      ragEmbeddings = new OllamaEmbeddings({
        model: process.env.RAG_EMBEDDING_MODEL,
        baseUrl: process.env.OLLAMA_BASE_URL,
      });
    } else {
      ragEmbeddings = new OpenAIEmbeddings(
        {
          modelName:
            process.env.RAG_EMBEDDING_MODEL ?? "text-embedding-3-large",
          openAIApiKey: apiKey,
        },
        { basePath: baseUrl },
      );
    }

    var dalleCallback = async (data: string) => {
      var response = new ResponseBody();
      response.message = data;
      await writer.ready;
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(response)}\n\n`),
      );
      controller.abort({
        reason: "dall-e tool abort",
      });
    };

    var nodejsTool = new NodeJSTool(
      apiKey,
      baseUrl,
      model,
      embeddings,
      reqBody.chatSessionId,
      ragEmbeddings,
      dalleCallback,
    );
    var nodejsTools = await nodejsTool.getCustomTools();
    console.log("Custom tools retrieved:", nodejsTools);

    // Instantiate the new Post2WordPressTool
    var post2WordPressTool = new Post2WordPressTool();

    var tools = [...nodejsTools, post2WordPressTool]; // Add the new tool to the tools array
    console.log("Tools to be used:", tools);

    return await agentApi.getApiHandler(req, reqBody, tools);
  } catch (e) {
    console.error("Error occurred:", e);
    return new Response(JSON.stringify({ error: (e as any).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "nodejs";
export const preferredRegion = [
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "iad1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
];
