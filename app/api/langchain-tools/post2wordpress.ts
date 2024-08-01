import axios from "axios";
import { URL } from "url";

export class Post2WordPressTool {
  name: string;
  description: string;
  apiUrl: URL;

  constructor() {
    this.name = "post2wordpress";
    this.description = `A tool to post articles to a WordPress site. It uses the WordPress XML-RPC API to create new posts.`;

    const apiUrl = process.env.WP_API_URL;
    if (!apiUrl) {
      throw new Error("`WP_API_URL` not configured");
    }

    this.apiUrl = new URL(apiUrl);
  }

  async call(input: { title: string; content: string; status?: string }) {
    const { title, content, status = "publish" } = input;
    const user = process.env.WP_USER;
    const password = process.env.WP_API_PASSWORD;

    if (!user || !password) {
      return "`WP_USER` or `WP_API_PASSWORD` not configured";
    }

    const post = {
      title: title,
      description: content,
      post_status: status,
      categories: ["Uncategorized"], // 默认分类，可以根据需要修改
      mt_keywords: ["tag1", "tag2"], // 默认标签，可以根据需要修改
    };

    const xml = `
      <methodCall>
        <methodName>wp.newPost</methodName>
        <params>
          <param><value><int>1</int></value></param>
          <param><value><string>${user}</string></value></param>
          <param><value><string>${password}</string></value></param>
          <param>
            <value>
              <struct>
                <member>
                  <name>title</name>
                  <value><string>${post.title}</string></value>
                </member>
                <member>
                  <name>description</name>
                  <value><string>${post.description}</string></value>
                </member>
                <member>
                  <name>post_status</name>
                  <value><string>${post.post_status}</string></value>
                </member>
                <member>
                  <name>categories</name>
                  <value>
                    <array>
                      <data>
                        ${post.categories.map((cat) => `<value><string>${cat}</string></value>`).join("")}
                      </data>
                    </array>
                  </value>
                </member>
                <member>
                  <name>mt_keywords</name>
                  <value>
                    <array>
                      <data>
                        ${post.mt_keywords.map((tag) => `<value><string>${tag}</string></value>`).join("")}
                      </data>
                    </array>
                  </value>
                </member>
              </struct>
            </value>
          </param>
        </params>
      </methodCall>
    `;

    try {
      console.log("[Post2WordPressTool] Sending request to:", this.apiUrl.href);
      console.log("[Post2WordPressTool] Request payload:", xml);

      const response = await axios.post(this.apiUrl.href, xml, {
        headers: {
          "Content-Type": "text/xml",
        },
      });

      console.log("[Post2WordPressTool] 文章发表成功，响应：", response.data);
      return { response: response.data };
    } catch (error) {
      console.error("[Post2WordPressTool] 请求错误：", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios error message:", error.message);
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
          console.error("Response headers:", error.response.headers);
        } else if (error.request) {
          console.error(
            "Request made but no response received:",
            error.request,
          );
        }
      } else {
        console.error("Non-Axios error:", error);
      }
      throw new Error("post error");
    }
  }
}

// Example usage
const tool = new Post2WordPressTool();
tool
  .call({ title: "这是文章标题", content: "这是文章内容" })
  .then((response) => console.log(response))
  .catch((error) => console.error(error));
