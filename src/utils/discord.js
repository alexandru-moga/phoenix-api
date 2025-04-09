const axios = require('axios');
require('dotenv').config();

/**
 * Sends application data to Discord via webhook
 */
async function sendApplicationToDiscord(application) {
  const {
    email,
    first_name,
    last_name,
    school,
    class: classYear,
    birthdate,
    phone,
    discord_username,
    student_id,
    superpowers
  } = application;

  // Format the message for Discord
  const embed = {
    title: "📝 New Phoenix Club Application",
    color: 0xec3750, // Phoenix Club red from CSS
    fields: [
      { name: "Name", value: `${first_name} ${last_name}`, inline: true },
      { name: "Email", value: email, inline: true },
      { name: "School", value: school, inline: true },
      { name: "Class", value: classYear, inline: true },
      { name: "Phone", value: phone, inline: true },
      { name: "Date of Birth", value: birthdate, inline: true },
      { name: "About & Superpowers", value: superpowers }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Phoenix Club Application System"
    }
  };

  const payload = {
    username: "Phoenix Club Applications",
    embeds: [embed]
  };

  try {
    const response = await axios.post(process.env.DISCORD_WEBHOOK_URL, payload);
    console.log('Application sent to Discord successfully');
    return response;
  } catch (error) {
    console.error('Error sending to Discord:', error);
    throw error;
  }
}

module.exports = { sendApplicationToDiscord };
