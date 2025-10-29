const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

/**
 * Retry function for Gemini API calls with exponential backoff
 */
async function retryGeminiCall(apiCall, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error.status === 503 || error.status === 429 || error.status === 500) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Moderate content using Gemini 2.5 Flash
 * @param {string} content - The content to moderate (post or comment)
 * @param {string} contentType - Type of content ('post' or 'comment')
 * @returns {Promise<{verdict: 'accept'|'reject', reason: string}>}
 */
const moderateContent = async (content, contentType = 'post') => {
  try {
    
    const moderationPrompt = `You are a content moderator for a mental health support forum where users share their struggles, emotions, and seek support anonymously.

CONTENT TO MODERATE:
"${content}"

MODERATION GUIDELINES:

✅ ACCEPT the content if it:
- Discusses mental health struggles (depression, anxiety, stress, etc.)
- Expresses emotional distress or vulnerability in a respectful manner
- Seeks support or advice for personal issues
- Shares personal experiences about mental wellness
- Contains sensitive topics handled respectfully
- Discusses suicidal thoughts in a help-seeking context (NOT promoting)
- Uses emotional language to express genuine pain or struggle
- Contains greetings and friendly messages (e.g., "Hello everyone", "Good morning", "How is everyone doing?")
- Includes general day-to-day questions or statements that don't promote self-harm (e.g., "What did you do today?", "I had a good day", "The weather is nice")
- Shares positive experiences, achievements, or casual conversations

❌ REJECT the content if it:
- Contains abusive language, profanity, or insults directed at others (e.g., "fuck you", cursing at people)
- Actively promotes or encourages self-harm or suicide
- Contains hate speech, discrimination, or harassment
- Includes personal identifiable information (PII) like full names, addresses, phone numbers, emails
- Is spam, advertising, or completely off-topic
- Contains explicit threats or violence towards others
- Is deliberately abusive, disrespectful, or trolling
- Uses offensive language in an aggressive or attacking manner
- Contains frustrated or angry comments directed at other users (e.g., blaming others, lashing out at the community)
- Shows hostility or aggression toward individuals or groups
- Expresses frustration in a way that attacks, belittles, or targets others

IMPORTANT CONTEXT:
- This is a MENTAL HEALTH SUPPORT FORUM focused on safety and respect
- Emotional, vulnerable, and sensitive discussions are WELCOMED
- Greetings, casual conversations, and day-to-day sharing are ENCOURAGED
- Users are anonymous and seeking a safe space
- Look at the INTENT: Is the user seeking help, sharing positively, or attacking others?
- Vulnerability is welcome, aggression is not
- Frustration about personal situations is okay, but frustration directed at others is not
- When in doubt about aggressive or abusive content, REJECT to maintain a safe space

KEY PRINCIPLES:
Distinguish between:
- EMOTIONAL EXPRESSION (allowed): "I'm so fucking depressed" or "This is so hard" or "I'm frustrated with my situation"
- DIRECTED ABUSE (not allowed): "Fuck you" or cursing AT other people or "You people are useless" or "Fuck Everybody"
- CASUAL SHARING (allowed): "Hello!", "How's everyone?", "I went for a walk today", "Good morning friends"
- FRUSTRATED ATTACK (not allowed): "This community sucks", "You all don't understand", "Why are you people so stupid"

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "accept",
  "reason": "Brief explanation"
}

OR

{
  "verdict": "reject",
  "reason": "Brief explanation"
}`;

    const result = await retryGeminiCall(() =>
      genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: moderationPrompt,
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent, predictable moderation
          maxOutputTokens: 200
        }
      })
    );

    const responseText = result.candidates[0].content.parts[0].text;

    // Parse the JSON response
    let moderationResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: accept by default if parsing fails (fail-safe approach)
      moderationResult = {
        verdict: 'accept',
        reason: 'Content appears safe (parsing issue, defaulting to accept)'
      };
    }

    // Validate response structure
    if (!moderationResult.verdict || !['accept', 'reject'].includes(moderationResult.verdict)) {
      // Fallback to accept
      return {
        verdict: 'accept',
        reason: 'Content appears safe (validation issue, defaulting to accept)'
      };
    }

    return moderationResult;

  } catch (error) {
    
    // Fail-safe: Accept content if moderation service fails
    // This ensures the forum remains functional even if AI is down
    return {
      verdict: 'accept',
      reason: 'Moderation service temporarily unavailable (defaulting to accept)'
    };
  }
};

/**
 * Batch moderate multiple contents (for efficiency)
 * @param {Array<{content: string, contentType: string}>} items
 * @returns {Promise<Array<{verdict: 'accept'|'reject', reason: string}>>}
 */
const moderateContentBatch = async (items) => {
  const results = await Promise.all(
    items.map(item => moderateContent(item.content, item.contentType))
  );
  return results;
};

module.exports = {
  moderateContent,
  moderateContentBatch
};

