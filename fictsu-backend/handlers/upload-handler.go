package handlers

import (
	"io"
	"fmt"
	"time"
	"strings"
	"context"
	"net/http"
	"path/filepath"
	"mime/multipart"
	"github.com/google/uuid"
	"github.com/gin-gonic/gin"

	gsc "cloud.google.com/go/storage"
	configs "github.com/Fictsu/Fictsu/configs"
)

func UploadImageToFirebase(file multipart.File, fileHeader *multipart.FileHeader, objectPath string, bucketName string) (string, error) {
	ctx := context.Background()

	storageClient, err := configs.FirebaseApp.Storage(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get the Firebase storage client: %v", err)
	}

	bucket, err := storageClient.Bucket(bucketName)
	if err != nil {
		return "", fmt.Errorf("failed to get the default bucket: %v", err)
	}

	writer := bucket.Object(objectPath).NewWriter(ctx)
	writer.ContentType = fileHeader.Header.Get("Content-Type")
	writer.CacheControl = "no-cache, max-age=0"
	if _, err := io.Copy(writer, file); err != nil {
		return "", fmt.Errorf("failed to upload a file: %v", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %v", err)
	}

	if err := bucket.Object(objectPath).ACL().Set(ctx, gsc.AllUsers, gsc.RoleReader); err != nil {
		return "", fmt.Errorf("failed to make file public: %v", err)
	}

	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s?t=%d", bucketName, objectPath, time.Now().Unix())
	return publicURL, nil
}

func UploadChapterImage(ctx *gin.Context) {
	err := ctx.Request.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		ctx.String(http.StatusBadRequest, "Could not parse form")
		return
	}

	file, fileHeader, err := ctx.Request.FormFile("image")
	if err != nil {
		ctx.String(http.StatusBadRequest, "Image not found in request")
		return
	}

	defer file.Close()

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		ctx.String(http.StatusBadRequest, "Unsupported file type")
		return
	}

	objectPath := "chapter-images/" + uuid.New().String() + ext
	bucketName := configs.BucketName

	publicURL, err := UploadImageToFirebase(file, fileHeader, objectPath, bucketName)
	if err != nil {
		ctx.String(http.StatusInternalServerError, "Upload failed: "+err.Error())
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{
		"image_URL": publicURL,
	})
}
