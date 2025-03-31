package handlers

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"

	env "github.com/Fictsu/Fictsu/configs"

	gsc "cloud.google.com/go/storage"
)

func UploadImageToFirebase(file multipart.File, fileHeader *multipart.FileHeader, objectPath string, bucketName string) (string, error) {
	ctx := context.Background()
	fmt.Println("Upload process")

	storageClient, err := env.FirebaseApp.Storage(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get Firebase storage client: %v", err)
	}
	fmt.Println("Get storage client")
	bucket, err := storageClient.Bucket(bucketName)
	if err != nil {
		return "", fmt.Errorf("failed to get default bucket: %v", err)
	}
	fmt.Println("Get bucket")
	writer := bucket.Object(objectPath).NewWriter(ctx)
	writer.ContentType = fileHeader.Header.Get("Content-Type")
	if _, err := io.Copy(writer, file); err != nil {
		return "", fmt.Errorf("failed to upload file: %v", err)
	}
	fmt.Println("Write file")
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %v", err)
	}
	fmt.Println("close file")
	if err := bucket.Object(objectPath).ACL().Set(ctx, gsc.AllUsers, gsc.RoleReader); err != nil {
		return "", fmt.Errorf("failed to make file public: %v", err)
	}
	fmt.Println("Publish file")
	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, objectPath)
	return publicURL, nil
}
