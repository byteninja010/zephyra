// Pseudonym generator for anonymous forum users
// Format: Adjective + Noun + 2-digit number

const adjectives = [
  'Gentle', 'Brave', 'Calm', 'Curious', 'Wise', 'Kind', 'Bright', 'Swift',
  'Silent', 'Happy', 'Bold', 'Peaceful', 'Thoughtful', 'Serene', 'Warm',
  'Clever', 'Noble', 'Radiant', 'Hopeful', 'Mindful', 'Tranquil', 'Vibrant',
  'Graceful', 'Steady', 'Gentle', 'Resilient', 'Creative', 'Focused', 'Patient',
  'Caring', 'Strong', 'Light', 'Free', 'Open', 'Clear', 'True', 'Honest',
  'Loyal', 'Earnest', 'Spirited', 'Lively', 'Friendly', 'Mellow', 'Eager',
  'Jovial', 'Witty', 'Humble', 'Zesty', 'Cosmic', 'Mystic'
];

const nouns = [
  'Falcon', 'Otter', 'Phoenix', 'Dolphin', 'Tiger', 'Eagle', 'Wolf', 'Fox',
  'Bear', 'Owl', 'Hawk', 'Raven', 'Lynx', 'Panda', 'Lion', 'Sparrow',
  'Butterfly', 'Crane', 'Deer', 'Swan', 'Robin', 'Heron', 'Turtle', 'Seal',
  'Whale', 'Dragon', 'Pegasus', 'Griffin', 'Unicorn', 'Phoenix', 'Star',
  'Moon', 'Sun', 'Cloud', 'River', 'Ocean', 'Mountain', 'Forest', 'Sky',
  'Breeze', 'Rain', 'Thunder', 'Dawn', 'Dusk', 'Aurora', 'Comet', 'Meteor',
  'Galaxy', 'Nova', 'Nebula'
];

/**
 * Generate a unique pseudonym
 * @returns {string} Pseudonym in format: AdjectiveNoun##
 */
const generatePseudonym = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 90) + 10; // 10-99
  
  return `${adjective}${noun}${number}`;
};

/**
 * Check if pseudonym is unique in the database
 * @param {Model} UserModel - Mongoose User model
 * @param {string} pseudonym - Pseudonym to check
 * @returns {Promise<boolean>}
 */
const isPseudonymUnique = async (UserModel, pseudonym) => {
  const existingUser = await UserModel.findOne({ pseudonym });
  return !existingUser;
};

/**
 * Generate a unique pseudonym that doesn't exist in the database
 * @param {Model} UserModel - Mongoose User model
 * @param {number} maxAttempts - Maximum attempts to generate unique pseudonym
 * @returns {Promise<string>}
 */
const generateUniquePseudonym = async (UserModel, maxAttempts = 20) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pseudonym = generatePseudonym();
    const isUnique = await isPseudonymUnique(UserModel, pseudonym);
    
    if (isUnique) {
      return pseudonym;
    }
  }
  
  // If all attempts fail, append timestamp to ensure uniqueness
  const pseudonym = generatePseudonym();
  return `${pseudonym}_${Date.now().toString().slice(-4)}`;
};

module.exports = {
  generatePseudonym,
  isPseudonymUnique,
  generateUniquePseudonym
};

