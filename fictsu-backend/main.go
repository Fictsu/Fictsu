package main

import (
	"time"
	"github.com/gin-gonic/gin"
	"github.com/markbates/goth"
	"github.com/gorilla/sessions"
	"github.com/gin-contrib/cors"
	"github.com/markbates/goth/providers/google"

	db "github.com/Fictsu/Fictsu/database"
	configs "github.com/Fictsu/Fictsu/configs"
	handlers "github.com/Fictsu/Fictsu/handlers"
)

func main() {
	configs.LoadEnv()

	store := sessions.NewCookieStore([]byte(configs.SessionKey))
	store.Options = &sessions.Options{
		HttpOnly: true,
		Secure:   false,
		Path:     "/",
	}

	goth.UseProviders(
		google.New(
			configs.ClientID,
			configs.ClientSecret,
			configs.ClientCallbackURL,
			"email", "profile",
		),
	)

	db.Connection()
	defer db.CloseConnection()

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	API := router.Group("/api")

	// GET
	API.GET("/f", handlers.GetAllFictions)
	API.GET("/f/:fictionID", handlers.GetFiction)
	API.GET("/auth/:provider", handlers.GetOpenAuthorization)
	API.GET("/f/:fictionID/:chapterID", handlers.GetChapter)

	API.GET("/user", func(ctx *gin.Context) {
		handlers.GetUserProfile(ctx, store)
	})
	API.GET("/auth/logout", func(ctx *gin.Context) {
		handlers.Logout(ctx, store)
	})
	API.GET("/auth/:provider/callback", func(ctx *gin.Context) {
		handlers.AuthorizedCallback(ctx, store)
	})
	API.GET("/f/:fictionID/fav/status", func(ctx *gin.Context) {
		handlers.CheckFavoriteFiction(ctx, store)
	})

	// POST
	API.POST("/f/c", func(ctx *gin.Context) {
		handlers.CreateFiction(ctx, store)
	})
	API.POST("/f/:fictionID/c", func(ctx *gin.Context) {
		handlers.CreateChapter(ctx, store)
	})
	API.POST("/f/:fictionID/fav", func(ctx *gin.Context) {
		handlers.AddFavoriteFiction(ctx, store)
	})

	// PUT
	API.PUT("/f/:fictionID/u", func(ctx *gin.Context) {
		handlers.EditFiction(ctx, store)
	})
	API.PUT("/f/:fictionID/:chapterID/u", func(ctx *gin.Context) {
		handlers.EditChapter(ctx, store)
	})

	// DELETE
	API.DELETE("/f/:fictionID/d", func(ctx *gin.Context) {
		handlers.DeleteFiction(ctx, store)
	})
	API.DELETE("/f/:fictionID/fav/rmv", func(ctx *gin.Context) {
		handlers.RemoveFavoriteFiction(ctx, store)
	})
	API.DELETE("/f/:fictionID/:chapterID/d", func(ctx *gin.Context) {
		handlers.DeleteChapter(ctx, store)
	})

	// OpenAI
	AI := API.Group("/ai")
	AI.POST("/storyline/c", handlers.OpenAICreateStoryline)
	AI.POST("/char/c", handlers.OpenAICreateCharacter)

	router.Run()
}
