import os
import sys
from openai import OpenAI
from mcp.server.mcpserver import MCPServer

server = MCPServer("nvidia-nemotron-mcp")

NVIDIA_API_KEY = os.environ.get(
    "NVIDIA_API_KEY",
    "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"
)
NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

client = OpenAI(
    base_url=NVIDIA_BASE_URL,
    api_key=NVIDIA_API_KEY
)

@server.tool(
    name="ask_nvidia_nemotron",
    description="Ask the NVIDIA Nemotron ultra model (550B) a question or provide instructions. Supports reasoning tokens."
)
def ask_nvidia_nemotron(
    prompt: str,
    system_prompt: str = "You are a helpful, expert AI assistant.",
    model: str = "nvidia/nemotron-3-ultra-550b-a55b",
    enable_thinking: bool = True,
    temperature: float = 0.7,
    max_tokens: int = 4096
) -> dict:
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        extra_body = {}
        if enable_thinking:
            extra_body["chat_template_kwargs"] = {"enable_thinking": True}

        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            top_p=0.95,
            max_tokens=max_tokens,
            extra_body=extra_body if extra_body else None,
            stream=True
        )

        reasoning_pieces = []
        content_pieces = []

        for chunk in completion:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            reasoning = getattr(delta, "reasoning_content", None)
            if reasoning:
                reasoning_pieces.append(reasoning)
            if delta.content is not None:
                content_pieces.append(delta.content)

        return {
            "status": "success",
            "model": model,
            "reasoning": "".join(reasoning_pieces),
            "response": "".join(content_pieces)
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@server.tool(
    name="evaluate_candidate_nemotron",
    description="Evaluate a candidate resume against a job description using NVIDIA Nemotron 550B deep reasoning."
)
def evaluate_candidate_nemotron(
    resume_text: str,
    job_description: str
) -> dict:
    prompt = f"""
Please evaluate the following candidate for the given job description.

=== JOB DESCRIPTION ===
{job_description}

=== CANDIDATE RESUME ===
{resume_text}

Provide:
1. Overall Fit Score (0-100)
2. Key Strengths & Matching Skills
3. Gaps / Weaknesses
4. Recommendation (Strong Yes, Yes, Lean Yes, No)
5. 3 Interview questions tailored to probe their weak spots
"""
    return ask_nvidia_nemotron(
        prompt=prompt,
        system_prompt="You are an elite technical recruiter and AI talent assessment specialist at Rankly.ai. Deliver structured, rigorous assessments.",
        enable_thinking=True,
        temperature=0.3
    )

if __name__ == "__main__":
    server.run(transport="stdio")
