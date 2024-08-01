import { Tool } from "@langchain/core/tools";
import fetch, { HeadersInit, RequestInit } from "node-fetch";

export interface RequestTool {
  headers: HeadersInit;
  maxOutputLength?: number;
  timeout: number;
}

export class Post2WordPressTool extends Tool implements RequestTool {
  name = "post2wordpress";
  maxOutputLength = Infinity;
  timeout = 30000;

  constructor(
    public headers: HeadersInit = {},
    { maxOutputLength }: { maxOutputLength?: number } = {},
    { timeout }: { timeout?: number } = {},
  ) {
    super(...arguments);

    this.maxOutputLength = maxOutputLength ?? this.maxOutputLength;
    this.timeout = timeout ?? this.timeout;
  }

  /** @ignore */
  async _call(input: { title: string; content: string }) {
    console.log(`_call method started with input: ${JSON.stringify(input)}`);
    try {
      let result = await this.postToWordPress(input.title, input.content);
      console.log(`_call method completed with result: ${result}`);
      return result;
    } catch (error) {
      console.error(`_call method encountered an error: ${error}`);
      return (error as Error).toString();
    }
  }

  async postToWordPress(title: string, content: string): Promise<string> {
    console.log(
      `postToWordPress method started with title: ${title}, content: ${content}`,
    );

    const wpApiUrl = process.env.WP_API_URL;
    const wpApiPassword = process.env.WP_API_PASSWORD;
    const wpUser = process.env.WP_USER;
    console.log(`WP_API_URL: ${process.env.WP_API_URL}`);
    console.log(`WP_USER: ${process.env.WP_USER}`);
    console.log(`WP_USER: ${process.env.WP_API_PASSWORD}`);

    if (!wpApiUrl || !wpApiPassword || !wpUser) {
      return "FAIL: Missing required environment variables.";
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${wpUser}:${wpApiPassword}`).toString("base64")}`,
    };
    console.log(`Request headers: ${JSON.stringify(headers)}`);

    const postData = {
      title: title,
      content: content,
      status: "publish",
    };

    console.log(`JSON data to be sent: ${JSON.stringify(postData)}`);

    try {
      const resp = await this.fetchWithTimeout(
        `${wpApiUrl}`,
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify(postData),
        },
        this.timeout,
      );

      console.log(`HTTP response received: ${resp.status}`);

      if (!resp.ok) {
        return `FAIL: Unable to post to WordPress. HTTP status: ${resp.status}`;
      }

      const responseText = await resp.text();
      console.log(`Response text received: ${responseText}`);

      return `SUCCESS: Post created with response: ${responseText}`;
    } catch (error) {
      console.error(`postToWordPress method encountered an error: ${error}`);
      return `FAIL: ${error}`;
    }
  }

  async fetchWithTimeout(
    resource: string,
    options: RequestInit,
    timeout: number = 30000,
  ) {
    console.log(`fetchWithTimeout method started with resource: ${resource}`);
    const controller = new AbortController();
    const id = setTimeout(() => {
      console.log(`Request timed out after ${timeout}ms`);
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      console.log(
        `fetchWithTimeout method completed with status: ${response.status}`,
      );
      return response;
    } catch (error) {
      clearTimeout(id);
      console.error(`fetchWithTimeout method encountered an error: ${error}`);
      throw error;
    }
  }

  description = `A tool to post articles to a WordPress site. It uses the WordPress REST API to create new posts.
Input must be an object with 'title' and 'content' properties.`;
}
