package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth/gothic"

	models "github.com/Fictsu/Fictsu/models"
)

func GetOpenAuthorization(ctx *gin.Context) {
	provider := ctx.Param("provider")
	query := ctx.Request.URL.Query()
	query.Add("provider", provider)
	ctx.Request.URL.RawQuery = query.Encode()

	gothic.BeginAuthHandler(ctx.Writer, ctx.Request)
}

func AuthorizedCallback(ctx *gin.Context, store *sessions.CookieStore) {
	provider := ctx.Param("provider")
	query := ctx.Request.URL.Query()
	query.Add("provider", provider)
	ctx.Request.URL.RawQuery = query.Encode()

	user, err := gothic.CompleteUserAuth(ctx.Writer, ctx.Request)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err.Error()})
		return
	}

	// Check if the user exists in the database
	userInDB, err := GetUser(user.UserID)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err.Error()})
		return
	}

	// Create a new user if not found
	if userInDB == nil {
		newUser := &models.UserModel{
			User_ID: 	user.UserID,
			Name: 		user.Name,
			Email: 		user.Email,
			Avatar_URL: user.AvatarURL,
		}

		createdUser, err := CreateUser(newUser)
		if err != nil {
			ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err.Error()})
			return
		}

		userInDB = createdUser
	}

	session, err := store.Get(ctx.Request, "fictsu-session")
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to create session"})
		return
	}

	session.Values["ID"] = userInDB.ID
	session.Values["name"] = userInDB.Name
	session.Values["email"] = userInDB.Email
	session.Values["avatar_URL"] = userInDB.Avatar_URL
	err = session.Save(ctx.Request, ctx.Writer)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to save session"})
		return
	}

	HTMLResponse := `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Logging in...</title>
			<script>
				window.opener.postMessage("login-success", "*");
				window.close();
			</script>
		</head>
		<body>
			<p>Logging in... If this window does not close, please close it manually.</p>
		</body>
		</html>
	`
	ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(HTMLResponse))
}

func Logout(ctx *gin.Context, store *sessions.CookieStore) {
	session, err := store.Get(ctx.Request, "fictsu-session")
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	// This removes the session immediately
	session.Options.MaxAge = -1
	err = session.Save(ctx.Request, ctx.Writer)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to clear session"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"Message": "Logged out"})
}
