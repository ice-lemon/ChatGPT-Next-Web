import { Tool } from "@langchain/core/tools";
import { getRandomUserAgent } from "./ua_tools";

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
    const headers = new Headers();
    headers.append("User-Agent", getRandomUserAgent());

    const url = `http://t.weather.itboy.net/api/weather/city/${cityCode}`;
    console.log(`Request URL: ${url}`);

    try {
      const resp = await this.fetchWithTimeout(
        url,
        { headers: headers },
        this.timeout,
      );
      console.log(`HTTP response received: ${resp.status}`);

      let rawData: { [key: string]: any } = await resp.json();
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
    resource: RequestInfo | URL,
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

  description = `A tool that fetches weather information for a given city code. It returns a JSON string containing the city name, update time, temperature, humidity, air quality, and forecast.
Input string must be a valid city code (e.g. 101120101).`;
}
