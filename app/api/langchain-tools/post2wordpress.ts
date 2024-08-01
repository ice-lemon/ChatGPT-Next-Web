import { Tool } from "@langchain/core/tools";
import axios, { AxiosRequestConfig } from "axios";

export interface RequestTool {
  headers: Record<string, string>;
  maxOutputLength?: number;
  timeout: number;
}

export class Post2WordPressTool extends Tool implements RequestTool {
  name = "post2wordpress";
  maxOutputLength = Infinity;
  timeout = 10000;

  constructor(
    public headers: Record<string, string> = {},
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

    if (!wpApiUrl || !wpApiPassword || !wpUser) {
      return "FAIL: Missing required environment variables.";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const postData = {
      title: title,
      content: content,
      status: "publish",
    };

    console.log(`JSON data to be sent: ${JSON.stringify(postData)}`);
    console.log(`Request headers: ${JSON.stringify(headers)}`);

    const config: AxiosRequestConfig = {
      method: "post",
      url: wpApiUrl,
      headers: headers,
      data: postData,
      auth: {
        username: wpUser,
        password: wpApiPassword,
      },
      timeout: this.timeout,
    };

    try {
      const resp = await axios(config);

      console.log(`HTTP response received: ${resp.status}`);

      if (resp.status !== 201) {
        // 201 Created is the expected status for a successful post creation
        console.error(`Error response data: ${resp.data}`);
        return `FAIL: Unable to post to WordPress. HTTP status: ${resp.status}, Error: ${resp.data}`;
      }

      console.log(`Response data received: ${JSON.stringify(resp.data)}`);
      return `SUCCESS: Post created with response: ${JSON.stringify(resp.data)}`;
    } catch (error) {
      console.error(`postToWordPress method encountered an error: ${error}`);
      return `FAIL: ${error}`;
    }
  }

  description = `A tool to post articles to a WordPress site. It uses the WordPress REST API to create new posts.
Input must be an object with 'title' and 'content' properties.`;
}
