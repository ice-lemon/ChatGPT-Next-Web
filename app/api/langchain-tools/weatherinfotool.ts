import { Tool } from "@langchain/core/tools";
import axios, { AxiosRequestConfig } from "axios";

export interface Headers {
  [key: string]: string;
}

export interface RequestTool {
  headers: Headers;
  maxOutputLength?: number;
  timeout: number;
}

export class WeatherInfoTool extends Tool implements RequestTool {
  name = "weather_info";
  maxOutputLength = Infinity;
  timeout = 10000;

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
      let result = await this.fetchWeatherInfo(input);
      console.log(`_call method completed with result: ${result}`);
      return result;
    } catch (error) {
      console.error(`_call method encountered an error: ${error}`);
      return (error as Error).toString();
    }
  }

  async fetchWeatherInfo(cityCode: string): Promise<string> {
    console.log(`fetchWeatherInfo method started with cityCode: ${cityCode}`);
    const headers = {
      "User-Agent": this.getRandomUserAgent(),
      ...this.headers,
    };

    const url = `http://t.weather.itboy.net/api/weather/city/${cityCode}`;
    console.log(`Request URL: ${url}`);

    try {
      const response = await this.fetchWithTimeout(
        url,
        { headers: headers },
        this.timeout,
      );
      console.log(`HTTP response received: ${response.status}`);

      let rawData: { [key: string]: any } = response.data;
      console.log(`Raw data received: ${JSON.stringify(rawData)}`);

      if (rawData.status !== 200) {
        return `FAIL: Unable to fetch weather data for city code ${cityCode}.`;
      }

      const data = {
        city: rawData.cityInfo.city,
        updateTime: rawData.cityInfo.updateTime,
        temperature: rawData.data.wendu,
        humidity: rawData.data.shidu,
        airQuality: rawData.data.quality,
        forecast: rawData.data.forecast,
      };

      return `SUCCESS: Weather data: ${JSON.stringify(data)}`;
    } catch (error) {
      console.error(`fetchWeatherInfo method encountered an error: ${error}`);
      return `FAIL: ${error}`;
    }
  }

  async fetchWithTimeout(
    resource: string,
    options: AxiosRequestConfig,
    timeout: number = 30000,
  ) {
    console.log(`fetchWithTimeout method started with resource: ${resource}`);
    try {
      const response = await axios.get(resource, {
        ...options,
        timeout: timeout,
      });
      console.log(
        `fetchWithTimeout method completed with status: ${response.status}`,
      );
      return response;
    } catch (error) {
      console.error(`fetchWithTimeout method encountered an error: ${error}`);
      throw error;
    }
  }

  getRandomUserAgent(): string {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      // Add more user agents as needed
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  description = `A tool that fetches weather information for a given city code. It returns a JSON string containing the city name, update time, temperature, humidity, air quality, and forecast.
Input string must be a valid city code (e.g. 101120101).`;
}
