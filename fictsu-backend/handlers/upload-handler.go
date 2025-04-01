package handlers

import (
	"io"
	"fmt"
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
		return "", fmt.Errorf("failed to get Firebase storage client: %v", err)
	}

	fmt.Println("Get the storage client")

	bucket, err := storageClient.Bucket(bucketName)
	if err != nil {
		return "", fmt.Errorf("failed to get default bucket: %v", err)
	}

	fmt.Println("Get the bucket")

	writer := bucket.Object(objectPath).NewWriter(ctx)
	writer.ContentType = fileHeader.Header.Get("Content-Type")
	if _, err := io.Copy(writer, file); err != nil {
		return "", fmt.Errorf("failed to upload file: %v", err)
	}

	fmt.Println("Write a file")

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %v", err)
	}

	fmt.Println("Close a file")

	if err := bucket.Object(objectPath).ACL().Set(ctx, gsc.AllUsers, gsc.RoleReader); err != nil {
		return "", fmt.Errorf("failed to make file public: %v", err)
	}

	fmt.Println("Publish a file")

	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, objectPath)
	return publicURL, nil
}
