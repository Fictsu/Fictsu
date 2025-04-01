package handlers

import (
	"io"
	"os"
	"fmt"
	"bytes"
	"strconv"
	"net/http"
	"encoding/json"
	"github.com/gin-gonic/gin"

	db "github.com/Fictsu/Fictsu/database"
	models "github.com/Fictsu/Fictsu/models"
	configs "github.com/Fictsu/Fictsu/configs"
)

const (
	INTRO_TEXT string = `Analyze my input and respond based on these rules:
	1. If I provide a story idea, generate a well-structured outline with logical progression.
	2. If I give a sentence or paragraph and request corrections, return a refined version with proper grammar while preserving the original intent.
	3. If I ask for advice on a storyline, character, or plot, provide insightful suggestions.
	4. If my input is a writing prompt, expand on it creatively and engagingly.
	5. If I make a general request or greeting unrelated to storytelling, respond concisely and appropriately.
	6. If my request is unclear or doesn't fit these rules, ask for clarification or politely decline.`

	OUTRO_TEXT string = " Always ensure your response aligns with these rules and maintains coherence and creativity."
	INTRO_CHAR string = "Please generate a character in a T-pose based on this prompt, so the image can be used as a reference for future generation. The prompt is: '"
)

func AddHeader(request *http.Request) {
	request.Header.Add("Content-Type", "application/json")
	request.Header.Add("Authorization", "Bearer " + configs.OpenAIKey)
	request.Header.Add("OpenAI-Organization", configs.OpenAIOrgID)
	request.Header.Add("OpenAI-Project", configs.OpenAIProjID)
}

func OpenAICreateStoryline(ctx *gin.Context) {
	requestBody := models.OpenAIRequestBodyText{}
	if err := ctx.ShouldBindJSON(&requestBody); err != nil {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "Invalid request body"})
		return
	}

	// Prepare OpenAI request payload
	URL := "https://api.openai.com/v1/chat/completions"
	promptMessage := fmt.Sprintf("%s '%s' %s", INTRO_TEXT, requestBody.Message, OUTRO_TEXT)

	openAIRequest := map[string]interface{}{
		"model": "gpt-4o",
		"messages": []map[string]string{
			{
				"role": "user",
				"content": promptMessage,
			},
		},
	}

	// Convert request body to JSON
	JSONBody, err := json.Marshal(openAIRequest)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to encode request"})
		return
	}

	// Create new HTTP request
	request, err := http.NewRequest("POST", URL, bytes.NewBuffer(JSONBody))
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to create request"})
		return
	}

	AddHeader(request)

	// Send request to OpenAI
	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to send request"})
		return
	}

	defer response.Body.Close()

	// Read response body
	body, err := io.ReadAll(response.Body)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to read response"})
		return
	}

	// Unmarshal OpenAI response
	responseBody := models.OpenAIResponseBody{}
	if err := json.Unmarshal(body, &responseBody); err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to decode response"})
		return
	}

	// Check if the response has choices
	if len(responseBody.Choices) == 0 {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "No choices returned from OpenAI"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"Received_Message": responseBody.Choices[0].Message.Content})
}

func OpenAICreateCharacter(ctx *gin.Context) {
	requestBody := models.OpenAIRequestBodyTextToImage{}
	if err := ctx.ShouldBindJSON(&requestBody); err != nil {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "Invalid request body"})
		return
	}

	URL := "https://api.openai.com/v1/images/generations"
	promptMessage := INTRO_CHAR + "'" + requestBody.Message + "'"

	openAIRequest := map[string]interface{}{
		"model":  "dall-e-3",
		"prompt": promptMessage,
		"n":      1,
		"size":   requestBody.Size,
	}

	// Convert request body to JSON
	JSONBody, err := json.Marshal(openAIRequest)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to encode request"})
		return
	}

	// Create new HTTP request
	request, err := http.NewRequest("POST", URL, bytes.NewBuffer(JSONBody))
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to create request"})
		return
	}

	AddHeader(request)

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to send request"})
		return
	}

	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to read response"})
		return
	}

	responseBody := models.DalleImageResponse{}
	if err := json.Unmarshal(body, &responseBody); err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to decode response"})
		return
	}

	// Check if the response has Data
	if len(responseBody.Data) == 0 {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "No choices returned from OpenAI"})
		return
	}

	var count int
	db.DB.QueryRow(
		`
		SELECT
			COUNT(*)
		FROM
			CharacterImage
		`,
	).Scan(&count)

	imageURL := responseBody.Data[0].URL
	filePath := configs.CharImagePath + strconv.Itoa(count+1) + ".png"
	err = DownloadImage(imageURL, filePath)
	if err != nil {
		fmt.Println("Error saving image:", err)
		return
	}

	fmt.Println("Image saved successfully to", filePath)
}

func DownloadImage(url, file_path string) error {
	// Send GET request
	response, err := http.Get(url)
	if err != nil {
		fmt.Println("Error getting response: ", err)
		return err
	}

	defer response.Body.Close()

	// Create a file
	file, err := os.Create(file_path)
	if err != nil {
		fmt.Println("Error creating file: ", err)
		return err
	}

	defer file.Close()

	// Copy the image data to the file
	_, err = io.Copy(file, response.Body)
	fmt.Println("Error copying file: ", err)
	return err
}
