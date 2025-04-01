package config

import (
	"log"
	"context"

	"google.golang.org/api/option"
	firebase "firebase.google.com/go/v4"
)

var FirebaseApp *firebase.App

func InitFirebaseApp() {
	opt := option.WithCredentialsFile("configs/firebase-create.json")
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Fatalf("Error initializing Firebase app: %v", err)
	}

	FirebaseApp = app
}
