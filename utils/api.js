const axios = require("axios");
const key = "key";
const apiBaseUrl = "http://37.114.41.51:6078/identify";

async function getName(imageUrl, altName) {
  try {
    const response = await axios.post(
      apiBaseUrl,
      { url: imageUrl, alt_name: altName },
      { headers: { "X-Authorization": key } }
    );
    if (response.data.error) {
      console.log(response.data.error);
      return [null, 0];
    }
    const { predicted_class: pokemonName, confidence } = response.data;
    return [pokemonName.toLowerCase(), confidence];
  } catch (error) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "An error occurred while getting the name. Please contact the admin!"
    );
    return [null, 0];
  }
}

module.exports = {
  getName,
};