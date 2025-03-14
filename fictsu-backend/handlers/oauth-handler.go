package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth/gothic"

	models "github.com/Fictsu/Fictsu/models"
	configs "github.com/Fictsu/Fictsu/configs"
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

	user, err_complete := gothic.CompleteUserAuth(ctx.Writer, ctx.Request)
	if err_complete != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err_complete.Error()})
		return
	}

	// Check if the user exists in the database
	user_in_db, err_get := GetUser(user.UserID)
	if err_get != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err_get.Error()})
		return
	}

	// Create a new user if not found
	if user_in_db == nil {
		new_user := &models.UserModel{
			User_ID: 	user.UserID,
			Name: 		user.Name,
			Email: 		user.Email,
			Avatar_URL: user.AvatarURL,
		}

		created_user, err_create_user := CreateUser(new_user)
		if err_create_user != nil {
			ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err_create_user.Error()})
			return
		}

		user_in_db = created_user
	}

	session, err_sess := store.Get(ctx.Request, "fictsu-session")
	if err_sess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to create session"})
		return
	}

	session.Values["ID"] = user_in_db.ID
	session.Values["name"] = user_in_db.Name
	session.Values["email"] = user_in_db.Email
	session.Values["avatar_URL"] = user_in_db.Avatar_URL
	err_sess = session.Save(ctx.Request, ctx.Writer)
	if err_sess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to save session"})
		return
	}

	ctx.Redirect(http.StatusSeeOther, configs.FrontEndURL)
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
