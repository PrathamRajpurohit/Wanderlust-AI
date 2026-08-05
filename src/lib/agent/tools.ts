import { TavilySearch } from "@langchain/tavily";

/**
 * Perform a web search using the Tavily Search API.
 * Returns the search results as a string, or an empty string on error.
 */
export async function tavilySearch(query: string): Promise<string> {
  try {
    // If the API key is not defined, fail early or try to let TavilySearch throw
    if (!process.env.TAVILY_API_KEY) {
      console.warn("TAVILY_API_KEY environment variable is not defined");
    }

    const searchTool = new TavilySearch({
      maxResults: 5,
    });

    const result = await searchTool.invoke({ query });
    
    if (typeof result === "string") {
      return result;
    }
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error executing tavilySearch for query:", query, error);
    return "";
  }
}
