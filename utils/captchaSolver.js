const { EmbedBuilder, WebhookClient } = require("discord.js");
const config = require("../config");
const axios = require('axios');
const http = require('http');

class CaptchaSolverAPI {
  constructor(options) {
    this.licenseKey = options.licenseKey;
    this.timeout = options.timeout || 120000;
    this.maxRetries = options.maxRetries || 3;
  }

  async solveCaptcha(uid, token) {
    if (!uid || !token) {
      throw new Error('Both uid and token are required');
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting to solve captcha (attempt ${attempt}/${this.maxRetries}) for user ${uid}`);
        
        const response = await axios.post("http://194.58.66.199:6973/solve-captcha", {
          token: token,
          uid: uid
        }, {
          headers: {
            "Content-Type": "application/json",
            "x-license-key": this.licenseKey
          },
          timeout: 30000
        });

        const result = response.data;
        console.log(`Captcha API response:`, JSON.stringify(result, null, 2));

        if (result && (result.status === true || result.success === true)) {
          return result;
        } else {
          throw new Error(result?.error || result?.message || result?.result || 'Captcha solving failed');
        }
      } catch (error) {
        console.error(`Captcha solving attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to solve captcha after ${this.maxRetries} attempts. Last error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
}

function solveShuupiro(apiKey, userId, token, hostname) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      userId: userId,
      token: token
    });

    const options = {
      hostname: hostname,
      port: 3000,
      path: '/solve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-api-key': apiKey
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          if (jsonResponse.result) {
            resolve({ success: true, result: jsonResponse.result });
          } else {
            resolve({
              success: false,
              error: jsonResponse.error || jsonResponse.message || 'Captcha solving failed'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: `Error parsing response: ${error.message}`
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

async function solveCaptcha(apiKey, userId, token, hostname) {
  const solverType = config.captchaSolver || "hoopa";
  const targetHostname = hostname || config.captchaApiHostname || "chutiya.shuupiro.online";
  
  if (solverType === "shuupiro") {
    console.log(`Using Shuupiro solver for user ${userId} on ${targetHostname}`);
    return await solveShuupiro(apiKey, userId, token, targetHostname);
  } else {
    console.log(`Using Hoopa solver for user ${userId}`);
    try {
      const solver = new CaptchaSolverAPI({
        licenseKey: apiKey,
        timeout: 120000,
        maxRetries: 3
      });

      const result = await solver.solveCaptcha(userId, token);
      
      return {
        success: true,
        result: result.solution || result.data || result.result || 'Solved successfully'
      };
    } catch (error) {
      console.error(`🚨 Hoopa captcha solving failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

function checkApiKeyBalance(apiKey, hostname) {
  const solverType = config.captchaSolver || "hoopa";
  
  if (solverType === "shuupiro") {
    return new Promise((resolve) => {
      const options = {
        hostname: hostname,
        port: 3000,
        path: '/usage',
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(responseData);
              resolve({ success: true, remaining: data.remaining });
            } catch (e) { resolve({ success: false }); }
          } else { resolve({ success: false }); }
        });
      });
      req.on('error', () => { resolve({ success: false }); });
      req.end();
    });
  }

  return new Promise((resolve) => {
    resolve({
      success: true,
      remaining: 9999,
      created: new Date().toISOString(),
      revoked: false
    });
  });
}

async function sendCaptchaMessage(username, userId, status, method = null, timeTaken = null) {
  const solverType = config.captchaSolver || "hoopa";
  const defaultMethod = solverType === "shuupiro" ? "Shuupiro Captcha Solver" : "Hoopa Captcha Solver";
  const finalMethod = method || defaultMethod;
  
  try {
    const hook = new WebhookClient({ url: config.captchaHook });

    let embed;
    if (status === "detected") {
      embed = new EmbedBuilder()
        .setTitle("🔍 CAPTCHA Detected")
        .setColor("#FF8C00")
        .addFields(
          { name: "User", value: username, inline: true },
          { name: "User ID", value: userId, inline: true },
          { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          { name: "Server", value: "JS", inline: true },
          { name: "Link", value: `[Captcha](https://verify.poketwo.net/captcha/${userId})`, inline: true }
        )
        .setDescription("Attempting automatic solve...")
        .setThumbnail("https://cdn.discordapp.com/emojis/852406980529381406.png");
    } else if (status === "solved") {
      embed = new EmbedBuilder()
        .setTitle("✅ CAPTCHA SOLVED SUCCESSFULLY")
        .setColor("#00FF00")
        .addFields(
          { name: "User", value: username, inline: true },
          { name: "User ID", value: userId, inline: true },
          { name: "Time Taken", value: timeTaken || "N/A", inline: true },
          { name: "Solver Method", value: finalMethod, inline: true }
        )
        .setDescription(`Today at ${new Date().toLocaleTimeString()}`)
        .setThumbnail("https://cdn.discordapp.com/emojis/852406980529381406.png");
    } else if (status === "failed") {
      embed = new EmbedBuilder()
        .setTitle("❌ CAPTCHA SOLVING FAILED")
        .setColor("#FF0000")
        .addFields(
          { name: "User", value: username, inline: true },
          { name: "User ID", value: userId, inline: true },
          { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          { name: "Solver Method", value: finalMethod, inline: true }
        )
        .setDescription("Manual intervention may be required")
        .setThumbnail("https://cdn.discordapp.com/emojis/852406980529381406.png");
    }

    await hook.send({
      username: status === "solved" ? "Spidey Bot" : finalMethod,
      avatarURL: "https://pngimg.com/d/mario_PNG125.png",
      embeds: [embed],
    });
  } catch (error) {
    console.error("Error sending captcha message:", error);
  }
}

module.exports = {
  CaptchaSolverAPI,
  solveCaptcha,
  checkApiKeyBalance,
  sendCaptchaMessage
};