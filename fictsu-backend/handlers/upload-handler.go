package handlers

import (
	"io"
	"fmt"
	"time"
	"context"
	"mime/multipart"

	gsc "cloud.google.com/go/storage"
	configs "github.com/Fictsu/Fictsu/configs"
)

func UploadImageToFirebase(file multipart.File, fileHeader *multipart.FileHeader, objectPath string, bucketName string) (string, error) {
	ctx := context.Background()

	fmt.Println("Upload processing")

	storageClient, err := configs.FirebaseApp.Storage(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get the Firebase storage client: %v", err)
	}

	fmt.Println("Get the storage client")

	bucket, err := storageClient.Bucket(bucketName)
	if err != nil {
		return "", fmt.Errorf("failed to get the default bucket: %v", err)
	}

	fmt.Println("Get the bucket")

	writer := bucket.Object(objectPath).NewWriter(ctx)
	writer.ContentType = fileHeader.Header.Get("Content-Type")
	writer.CacheControl = "no-cache, max-age=0"
	if _, err := io.Copy(writer, file); err != nil {
		return "", fmt.Errorf("failed to upload a file: %v", err)
	}

	fmt.Println("Write the file")

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %v", err)
	}

	fmt.Println("Close the file")

	if err := bucket.Object(objectPath).ACL().Set(ctx, gsc.AllUsers, gsc.RoleReader); err != nil {
		return "", fmt.Errorf("failed to make file public: %v", err)
	}

	fmt.Println("Publish the file")

	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s?t=%d", bucketName, objectPath, time.Now().Unix())
	return publicURL, nil
}
