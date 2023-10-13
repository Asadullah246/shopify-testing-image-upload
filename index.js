import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
// const sharp = require('sharp');
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
dotenv.config();
const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());

// Define your Shopify store credentials
const shopifyApiUrl = `https://${process.env.STORE_URL}/admin/api/2023-10/graphql.json`; // Replace with your shop's URL
const shopifyApiAccessToken = process.env.SHOPIF_API_PASS_WITH_TOKEN; // Replace with your API access token


function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Create the "downloads" and "compressed" directories if they don't exist
ensureDirectoryExists('downloads');
ensureDirectoryExists('compressed');


app.post("/update-image", async (req, res) => {
  try {
    const mutation = `mutation UpdateImage($input: [FileUpdateInput!]!) {
      fileUpdate(files: $input) {
        userErrors {
          message
        }
      }
    }`;

    const variables = {
      input: [
        {
          id: "gid://shopify/MediaImage/33449254158626",
          originalSource: "https://images.unsplash.com/photo-1696257203553-20ada15fce65?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
        },
      ],
    };

    const requestBody = {
      query: mutation,
      variables: variables,
    };

    const response = await fetch(shopifyApiUrlWithAuth, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyApiAccessToken,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("data", data);
    res.json({ data });
  } catch (error) {
    console.error("Error updating image in Shopify:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// file upload function
const fileUpdateToStore=async(id,fileUrl)=>{
  try {
    const mutation = `mutation UpdateImage($input: [FileUpdateInput!]!) {
      fileUpdate(files: $input) {
        userErrors {
          message
        }
      }
    }`;

    const variables = {
      input: [
        {
          id: id,
          originalSource: fileUrl,
        },
      ],
    };

    const requestBody = {
      query: mutation,
      variables: variables,
    };

    const response = await fetch(shopifyApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyApiAccessToken,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    // const data = await response.json();
    console.log("file uploaded",id);
    // res.json({ data });
  } catch (error) {
    console.error("Error updating image in Shopify:",id, error);
    // res.status(500).json({ error: "Internal server error" });
  }
}
// end of file upload function


// Endpoint to update an image on Shopify
app.get("/update-image", async (req, res) => {
  try {
    // Send a GraphQL mutation to Shopify to update an image
    const response = await fetch(shopifyApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyApiAccessToken,
      },
      body: JSON.stringify({
        query: `mutation fileUpdate($input: [FileUpdateInput!]!) {
            fileUpdate(files: $input) {
              files {
                ... on MediaImage {
                  id
                  image {
                    url
                  }
                }
              }
              userErrors {
                message
              }
            }
          }`,
        variables: {
          input: {
            id: "gid://shopify/MediaImage/34709575991584",
            originalSource:
              "https://fastly.picsum.photos/id/543/700/500.jpg?hmac=udAfUnwR_YYHMdWiooJXL7zTtOs0PDfXfzlT2et3DiM",
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const data = await response.json();
    res.json({ data });
  } catch (error) {
    console.error("Error fetching product images from Shopify:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch product images from Shopify
app.get("/product-images", async (req, res) => {
  try {
    // Make a GraphQL request to Shopify to fetch all products and their images
    const response = await fetch(shopifyApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyApiAccessToken,
      },
      body: JSON.stringify({
        query: `query {
          files(first: 27) {
            edges {
              node {
                ... on MediaImage {
                  id
                  image {
                    id
                    originalSrc: url
                    width
                    height
                  }
                }
              }
            }
          }
        }`,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const data = await response.json();

    //  custom

    const responseData = data.data; // Assuming that the data is stored in a 'data' field
    console.log("res", responseData);
    if (responseData && responseData?.files && responseData?.files?.edges) {
      // Extract the array of media images from the response
      const mediaImages = responseData.files.edges;

      // mediaImages is all data

      // Loop through the mediaImages array to process each image
      for (const imageInfo of mediaImages) {
        // Get the unique ID for this MediaImage (for changing image)
        const MediaImageId = imageInfo.node.id;

        // Check if the image source exists and extract it (this is the actual image source that needs optimization)
        const MediaImageSrc = imageInfo.node?.image?.originalSrc;

        // Log the MediaImageId and its source for debugging or further processing

        // Now you can optimize the MediaImageSrc as needed
        // After optimization, you can update the image source by calling the API again with MediaImageId
      }

      // functions for save image and compress


      async function downloadImage(imageUrl, localFileName) {
        const localFilePath = path.join('downloads', localFileName); // Specify the downloads folder
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        response.data.pipe(fs.createWriteStream(localFilePath));

        return new Promise((resolve, reject) => {
          response.data.on('end', () => resolve(localFilePath));
          response.data.on('error', reject);
        });
      }

      async function compressImage(inputFileName, outputFileName) {
        const inputPath = path.join('downloads', inputFileName); // Specify the downloads folder
        const outputPath = path.join('compressed', outputFileName); // Specify the compressed folder

        await sharp(inputPath)
          .resize({ width: 800, height:800, fit: sharp.fit.inside })
          .toFile(outputPath);
      }

      // functions for save image and compress
console.log("all files ", mediaImages );
      // testing
      for (const edge of mediaImages) {
        const imageNode = edge.node.image;
        if (imageNode) {
          const imageUrl = imageNode.originalSrc;
          // const localFilePath = `path/to/local/${edge.node.id}.jpg`;
          // const compressedFilePath = `path/to/compressed/${edge.node.id}.jpg`;
          const randomNumber = Math.floor(Math.random() * 1000);
          const localFileName = `${randomNumber}.jpg`;
          // const localFileName = `${edge.node.id}.jpg`;
          // const compressedFileName = `${edge.node.id}.jpg`;
          const compressedFileName = `${randomNumber}.jpg`;

          await downloadImage(imageUrl, localFileName);
          await compressImage(localFileName, compressedFileName);
          const compressedImagePath = path.join('compressed',compressedFileName); // Specify the path to the compressed image
          const imageBuffer = fs.readFileSync(compressedImagePath);
          console.log("path", compressedImagePath );
          console.log("image", imageBuffer );
          await fileUpdateToStore(edge.node.id,compressedImagePath)

          console.log("done",edge.node.id); 
          // await updateShopifyProductImage(imageNode, compressedFilePath);
        }
      }
      console.log("all done ");
      // testing
    } else {
      // Log an error message if the data structure is not as expected
      console.error("Data structure is not as expected.");
    }


    //  end of custom

    res.json({ data });
  } catch (error) {
    console.error("Error fetching product images from Shopify:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
