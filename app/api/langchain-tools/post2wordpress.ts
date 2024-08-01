import { Tool } from "@langchain/core/tools";
import fetch from "node-fetch";

export interface Headers {
  [key: string]: string;
}

export interface RequestTool {
  headers: Headers;
  maxOutputLength?: number;
  timeout: number;
}

export class Post2WordPressTool extends Tool implements RequestTool {
  name = "post2wordpress";
  maxOutputLength = Infinity;
  timeout = 30000;

  constructor(
    public headers: Headers = {},
    { maxOutputLength }: { maxOutputLength?: number } = {},
    { timeout }: { timeout?: number } = {},
  ) {
    super(...arguments);

    this.maxOutputLength = maxOutputLength ?? this.maxOutputLength;
    this.timeout = timeout ?? this.timeout;
  }

  /** @ignore */
  async _call(input: string) {
    console.log(`_call method started with input: ${input}`);
    try {
      let result = await this.postToWordPress(input);
      console.log(`_call method completed with result: ${result}`);
      return result;
    } catch (error) {
      console.error(`_call method encountered an error: ${error}`);
      return (error as Error).toString();
    }
  }

  async postToWordPress(content: string): Promise<string> {
    console.log(`postToWordPress method started with content: ${content}`);

    const wpApiUrl = process.env.WP_API_URL;
    const wpApiPassword = process.env.WP_API_PASSWORD;
    const wpUser = process.env.WP_USER;

    if (!wpApiUrl || !wpApiPassword || !wpUser) {
      return "FAIL: Missing required environment variables.";
    }

    const headers = new Headers();
    headers.append("Content-Type", "text/xml");

    const xmlData = `
      <?xml version="1.0" encoding="UTF-8"?>
      <methodCall>
        <methodName>wp.newPost</methodName>
        <params>
          <param><value><string>${wpUser}</string></value></param>
          <param><value><string>${wpApiPassword}</string></value></param>
          <param><value><string>1</string></value></param>
          <param>
            <value>
              <struct>
                <member>
                  <name>post_title</name>
                  <value><string>GPT Summary</string></value>
                </member>
                <member>
                  <name>post_content</name>
                  <value><string>${content}</string></value>
                </member>
                <member>
                  <name>post_status</name>
                  <value><string>publish</string></value>
                </member>
              </struct>
            </value>
          </param>
        </params>
      </methodCall>
    `;

    console.log(`XML data to be sent: ${xmlData}`);

    try {
      const resp = await this.fetchWithTimeout(
        wpApiUrl as RequestInfo,
        {
          method: "POST",
          headers: headers,
          body: xmlData,
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
    resource: RequestInfo,
    options = {},
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

  description = `A tool to post articles to a WordPress site. It uses the WordPress XML-RPC API to create new posts.
Input string must be the content to be posted.`;
}
