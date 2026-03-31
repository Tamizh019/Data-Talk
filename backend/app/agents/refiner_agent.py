"""
Report Refiner Agent (Phase 9)
Acts as the final safeguard before sending the text payload to the frontend.
Reviews the Analyst's output to ensure it is grammatically correct, matches the user's intent, and contains no raw JSON/markdown glitches.
"""
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

REFINER_SYSTEM = """You are a meticulous Data Publishing Editor.
Your job: Review the Business Analyst's explanation of data before it is sent to the CEO/User.

Rules:
1. Ensure the response cleanly, directly answers the User's Request.
2. Remove any robotic framing (e.g. "Here is the data," "As an AI").
3. Ensure no raw JSON artifacts, raw SQL, or broken markdown fences leaked in.
4. Keep the output extremely conversational, crisp, and professional.
5. Do NOT change the facts or the numbers from the Original Explanation. Only fix the tone/formatting.
6. The Original Explanation will contain 3 suggested Follow-up Questions at the end. You MUST preserve these questions exactly as they are without omitting them.

If the Original Explanation is fine, just rewrite it slightly smoother or leave it as is.
DO NOT output anything other than the final beautiful text response.
"""

async def refine_final_report(user_query: str, analyst_explanation: str) -> str:
    prompt = f"### User Request\n{user_query}\n\n### Original Analyst Explanation\n{analyst_explanation}\n\n### Polished Final Version:\n"
    
    try:
        completion = await client.chat.completions.create(
            model=settings.refiner_model,
            messages=[
                {"role": "system", "content": REFINER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=500
        )
        refined = completion.choices[0].message.content.strip()
        logger.info("[RefinerAgent] Successfully reviewed and refined report.")
        return refined
        
    except Exception as e:
        logger.warning(f"[RefinerAgent] Failed during refinement: {e}")
        # Soft-fail: on error, just return the unrefined explanation
        return analyst_explanation
