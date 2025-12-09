import { StateGraph, Annotation } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { getGeminiModel } from './gemini'
import { performSearch } from './researcher'
import { getProfile, getAgentConfig } from '@/lib/db/queries'

// Define the agent state
export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    // Track the search run ID if a search was executed
    searchRunId: Annotation<string | null>({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
})

// Node: Lead Agent (Supervisor)
async function leadAgent(state: typeof AgentState.State) {
    const model = getGeminiModel()
    const profile = getProfile()
    const agentConfig = getAgentConfig()

    if (!profile || !agentConfig) {
        return {
            messages: [new AIMessage("I cannot proceed without a configured profile and agent settings.")]
        }
    }

    // Construct the system prompt
    const systemPrompt = `You are a Lead Search Agent. Your goal is to help the user find jobs.
  
  Current User Profile:
  ${JSON.stringify(profile, null, 2)}
  
  You have access to a "job_search" tool.
  If the user asks to find jobs, or if it's the first interaction and no search has been done, you should call the "job_search" tool.
  
  If a search has already been completed (check the conversation history), summarize the results or ask if they want to refine the search.
  `

    // For now, we'll just use a simple decision logic without full tool binding if we want to keep it simple first,
    // but let's try to be robust.
    // Actually, since we are integrating into an existing flow, let's make it simple:
    // If the last message is from human and asks for search, or if we are just starting, trigger search.

    const lastMessage = state.messages[state.messages.length - 1]

    // If we just finished a search (indicated by a tool output or specific state), we stop.
    // But here we are building the graph.

    // Let's bind tools to the model
    // Note: executeSearch is a complex function, we might want to wrap it.

    return {
        messages: [new AIMessage("Starting search process...")]
    }
}

// Node: Job Search Tool
async function jobSearchNode(state: typeof AgentState.State) {
    try {
        console.log("Executing job search node...")
        const result = await performSearch()
        return {
            messages: [new AIMessage(`Search completed. Found ${result.jobsFound} jobs. Run ID: ${result.searchRunId}`)],
            searchRunId: result.searchRunId
        }
    } catch (error) {
        return {
            messages: [new AIMessage(`Search failed: ${error}`)]
        }
    }
}

// Define the graph
const workflow = new StateGraph(AgentState)
    .addNode("lead_agent", leadAgent)
    .addNode("job_search", jobSearchNode)
    .addEdge("__start__", "lead_agent")
    .addEdge("lead_agent", "job_search") // For now, force search
    .addEdge("job_search", "__end__")

export const graph = workflow.compile()
