//app/api/langchain-tools/post2wordpress.ts
import { Tool } from "@langchain/core/tools";
import fetch, { HeadersInit, RequestInit } from "node-fetch";

export interface RequestTool {
  headers: HeadersInit;
  maxOutputLength?: number;
  timeout: number;
}

export class Post2WordPressTool extends Tool implements RequestTool {
  name = "post2wordpress";
  lc_serializable = true;
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
  async _call(input: any) {
    console.log(`_call method started with input: ${JSON.stringify(input)}`);

    let parsedInput: { title: string; content: string };
    if (typeof input === "string") {
      try {
        parsedInput = JSON.parse(input);
      } catch (error) {
        console.error("Failed to parse input as JSON.", error);
        return "FAIL: 输入格式不正确，请使用JSON格式。"; // 使用中文备注
      }
    } else {
      parsedInput = input;
    }

    // 只接受一个参数，默认作为content，title使用默认值
    const { content = "", title = "默认标题" } = parsedInput;
    if (!content) {
      console.error("文章内容不能为空。");
      return "FAIL: 文章内容不能为空。"; // 使用中文备注
    }

    try {
      let result = await this.postToWordPress(title, content);
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

    const wpApiUrl = process.env.WP_POST_API_URL;
    const wpUser = process.env.WP_USER;
    const wpPassword = process.env.WP_PASSWORD;

    console.log(`WP_API_URL: ${wpApiUrl}`);
    console.log(`WP_USER: ${wpUser}`);

    if (!wpApiUrl || !wpUser || !wpPassword) {
      return "FAIL: Missing required environment variables.";
    }

    const authToken = Buffer.from(`${wpUser}:${wpPassword}`).toString("base64");
    console.log(`Base64 auth token: ${authToken}`); // This line should be removed in production

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`,
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
Input must be a JSON string with 'title' and 'content' properties. Such as {"title": "My Post Title", "content": "My Post Content"}，article will be posted to the WordPress site，，article language must be Chinese.`;
}
