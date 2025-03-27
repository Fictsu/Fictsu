package handlers

import (
	"fmt"
	"time"
	"net/http"
	"database/sql"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"

	db "github.com/Fictsu/Fictsu/database"
	models "github.com/Fictsu/Fictsu/models"
)

func GetUserProfile(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized"})
		return
	}

	IDToDB := IDFromSession.(int)
	user := models.UserModel{}
	err := db.DB.QueryRow(
		`
		SELECT
			ID, User_ID, Super_User, Name, Email, Avatar_URL, Joined
		FROM
			Users
		WHERE
			ID = $1
		`,
		IDToDB,
	).Scan(
		&user.ID,
		&user.User_ID,
		&user.Super_User,
		&user.Name,
		&user.Email,
		&user.Avatar_URL,
		&user.Joined,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "User not found"})
		} else {
			ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to retrieve user details"})
		}

		return
	}

	favFictions, err := GetFavFictions(IDToDB)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to retrieve favorite fictions"})
		return
	}

	contriFictions, err := GetContributedFictions(IDToDB)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to retrieve contributed fictions"})
		return
	}

	user.ID = IDToDB
	user.Fav_Fictions = favFictions
	user.Contributed_Fic = contriFictions
	ctx.IndentedJSON(http.StatusOK, gin.H{"User_Profile": user})
}

func GetUser(userID string) (*models.UserModel, error) {
	user := models.UserModel{}
	err := db.DB.QueryRow(
		`
		SELECT
			ID, User_ID, Name, Email, Avatar_URL, Joined
		FROM
			Users
		WHERE
			User_ID = $1
		`,
		userID,
	).Scan(
		&user.ID,
		&user.User_ID,
		&user.Name,
		&user.Email,
		&user.Avatar_URL,
		&user.Joined,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// No user found
			return nil, nil
		} else {
			return nil, fmt.Errorf("failed to retrieve user from database: %v", err)
		}
	}

	return &user, nil
}

func CreateUser(user *models.UserModel) (*models.UserModel, error) {
	var newUserID int
	var newUserGoogleID string
	var newUserJoined time.Time
	err := db.DB.QueryRow(
		`
		INSERT INTO Users (User_ID, Name, Email, Avatar_URL)
		VALUES ($1, $2, $3, $4)
		RETURNING ID, User_ID, Joined
		`,
		user.User_ID,
		user.Name,
		user.Email,
		user.Avatar_URL,
	).Scan(
		&newUserID,
		&newUserGoogleID,
		&newUserJoined,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user account: %v", err)
	}

	user.ID = newUserID
	user.User_ID = newUserGoogleID
	user.Joined = newUserJoined
	return user, nil
}
