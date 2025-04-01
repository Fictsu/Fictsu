package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/lib/pq"

	configs "github.com/Fictsu/Fictsu/configs"
	db "github.com/Fictsu/Fictsu/database"
	models "github.com/Fictsu/Fictsu/models"
)

func GetAllFictions(ctx *gin.Context) {
	rows, err := db.DB.Query(
		`
		SELECT
			ID, Contributor_ID, Contributor_Name, Cover, Title,
			Subtitle, Author, Artist, Status, Synopsis, Created
		FROM
			Fictions
		`,
	)

	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to fetch fictions"})
		return
	}

	defer rows.Close()
	fictions := []models.FictionModel{}
	for rows.Next() {
		fiction := models.FictionModel{}
		if err := rows.Scan(
			&fiction.ID,
			&fiction.Contributor_ID,
			&fiction.Contributor_Name,
			&fiction.Cover,
			&fiction.Title,
			&fiction.Subtitle,
			&fiction.Author,
			&fiction.Artist,
			&fiction.Status,
			&fiction.Synopsis,
			&fiction.Created,
		); err != nil {
			fmt.Println("err is:", err)
			ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Error processing fictions"})
			return
		}

		fictions = append(fictions, fiction)
		fmt.Println(fictions)
	}

	ctx.IndentedJSON(http.StatusOK, fictions)
}

func GetFiction(ctx *gin.Context) {
	fictionID := ctx.Param("fictionID")
	fiction := models.FictionModel{}
	err := db.DB.QueryRow(
		`
		SELECT
			ID, Contributor_ID, Contributor_Name, Cover, Title,
			Subtitle, Author, Artist, Status, Synopsis, Created
		FROM
			Fictions
		WHERE
			ID = $1
		`,
		fictionID,
	).Scan(
		&fiction.ID,
		&fiction.Contributor_ID,
		&fiction.Contributor_Name,
		&fiction.Cover,
		&fiction.Title,
		&fiction.Subtitle,
		&fiction.Author,
		&fiction.Artist,
		&fiction.Status,
		&fiction.Synopsis,
		&fiction.Created,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Fiction not found"})
		} else {
			ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to retrieve fiction"})
		}

		return
	}

	// Get genres of the fiction
	genres, err := GetAllGenres(fictionID)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err.Error()})
		return
	}

	// Get chapters of the fiction
	chapters, err := GetAllChapters(fictionID)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": err.Error()})
		return
	}

	fiction.Genres = genres
	fiction.Chapters = chapters
	ctx.IndentedJSON(http.StatusOK, gin.H{"Fiction": fiction})
}

func CreateFiction(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	nameFromSession := session.Values["name"]
	if IDFromSession == nil || nameFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to create a fiction."})
		return
	}

	IDToDB := IDFromSession.(int)
	nameToDB := nameFromSession.(string)

	fictionCreateRequest := models.FictionForm{}
	if err := ctx.ShouldBind(&fictionCreateRequest); err != nil {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "Invalid data provided for fiction creation"})
		return
	}

	fictionCreateRequest.Contributor_ID = IDToDB
	fictionCreateRequest.Contributor_Name = nameToDB

	var newFictionID int
	var newCreatedTS time.Time
	err := db.DB.QueryRow(
		`
		INSERT INTO Fictions (Contributor_ID, Contributor_Name, Title, Subtitle, Author, Artist, Status, Synopsis)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ID, Created
		`,
		fictionCreateRequest.Contributor_ID,
		fictionCreateRequest.Contributor_Name,
		fictionCreateRequest.Title,
		fictionCreateRequest.Subtitle,
		fictionCreateRequest.Author,
		fictionCreateRequest.Artist,
		fictionCreateRequest.Status,
		fictionCreateRequest.Synopsis,
	).Scan(
		&newFictionID,
		&newCreatedTS,
	)

	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to create fiction"})
		return
	}

	fictionCreateRequest.ID = newFictionID
	fictionCreateRequest.Created = newCreatedTS

	if file, header, err := ctx.Request.FormFile("cover"); err == nil {
		coverPath := configs.CoverPath + strconv.Itoa(newFictionID)
		if URL, err := UploadImageToFirebase(file, header, coverPath, configs.BucketName); err == nil {
			db.DB.Exec("UPDATE Fictions SET Cover = $1 WHERE ID = $2", URL, newFictionID)
		}
	}

	fiction := models.FictionModel{}
	fiction.ID = fictionCreateRequest.ID
	fiction.Artist = fictionCreateRequest.Artist
	fiction.Author = fictionCreateRequest.Author
	fiction.Contributor_ID = fictionCreateRequest.Contributor_ID
	fiction.Contributor_Name = fictionCreateRequest.Contributor_Name
	fiction.Created = fictionCreateRequest.Created
	fiction.Status = fictionCreateRequest.Status
	fiction.Title = fictionCreateRequest.Title
	fiction.Subtitle = fictionCreateRequest.Subtitle
	fiction.Synopsis = fictionCreateRequest.Synopsis
	ctx.IndentedJSON(http.StatusCreated, fiction)
}

func EditFiction(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to edit the fiction."})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")

	// Check if the fiction exists and if the contributor matches the logged-in user
	var getContributorID int
	errMatch := db.DB.QueryRow(
		`
		SELECT
			Contributor_ID
		FROM
			Fictions
		WHERE
			ID = $1
		`,
		fictionID,
	).Scan(
		&getContributorID,
	)

	if errMatch != nil {
		if errMatch == sql.ErrNoRows {
			ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Fiction not found"})
			return
		}

		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to fetch fiction data"})
		return
	}

	// Verify that the logged-in user is the contributor
	if getContributorID != IDToDB {
		ctx.IndentedJSON(http.StatusForbidden, gin.H{"Error": "You do not have permission to edit this fiction"})
		return
	}

	fictionUpdateRequest := models.FictionForm{}
	if err := ctx.ShouldBind(&fictionUpdateRequest); err != nil {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "Invalid input data"})
		return
	}

	query := "UPDATE Fictions SET "
	params := []interface{}{}
	paramIndex := 1
	// if fictionUpdateRequest.Cover != "" {
	// 	query += "Cover = $" + strconv.Itoa(paramIndex) + ", "
	// 	params = append(params, fictionUpdateRequest.Cover)
	// 	paramIndex++
	// }

	if fictionUpdateRequest.Title != "" {
		query += "Title = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, fictionUpdateRequest.Title)
		paramIndex++
	}

	if fictionUpdateRequest.Subtitle != "" {
		query += "Subtitle = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, fictionUpdateRequest.Subtitle)
		paramIndex++
	}

	if fictionUpdateRequest.Author != "" {
		query += "Author = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, fictionUpdateRequest.Author)
		paramIndex++
	}

	if fictionUpdateRequest.Artist != "" {
		query += "Artist = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, fictionUpdateRequest.Artist)
		paramIndex++
	}

	if fictionUpdateRequest.Status != "" {
		query += "Status = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, fictionUpdateRequest.Status)
		paramIndex++
	}

	if fictionUpdateRequest.Synopsis != "" {
		query += "Synopsis = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, fictionUpdateRequest.Synopsis)
		paramIndex++
	}

	if len(params) == 0 {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "No valid fields provided for update"})
		return
	}

	query = query[:len(query) - 2] + " WHERE ID = $" + strconv.Itoa(paramIndex)
	params = append(params, fictionID)
	result, err := db.DB.Exec(query, params...)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to update fiction"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Fiction not found"})
		return
	}

	if file, header, err := ctx.Request.FormFile("cover"); err == nil {
		coverPath := configs.CoverPath + fictionID
		if url, err := UploadImageToFirebase(file, header, coverPath, configs.BucketName); err == nil {
			db.DB.Exec("UPDATE Fictions SET Cover = $1 WHERE ID = $2", url, fictionID)
		}
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"Message": "Fiction updated successfully"})
}

func DeleteFiction(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to delete fiction."})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")

	// Check if the fiction exists and if the contributor matches the logged-in user
	var getContributorID int
	errMatch := db.DB.QueryRow(
		`
		SELECT
			Contributor_ID
		FROM
			Fictions
		WHERE
			ID = $1
		`,
		fictionID,
	).Scan(
		&getContributorID,
	)

	if errMatch != nil {
		if errMatch == sql.ErrNoRows {
			ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Fiction not found"})
			return
		}

		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to fetch fiction data"})
		return
	}

	// Verify that the logged-in user is the contributor
	if getContributorID != IDToDB {
		ctx.IndentedJSON(http.StatusForbidden, gin.H{"Error": "You do not have permission to delete this fiction"})
		return
	}

	result, err := db.DB.Exec(
		`
		DELETE FROM 
			Fictions 
		WHERE
			ID = $1
		`,
		fictionID,
	)

	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to delete fiction"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Fiction not found"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"Message": "Fiction deleted successfully"})
}

func GetContributedFictions(user_ID int) ([]models.FictionModel, error) {
	rows, err := db.DB.Query(
		`
		SELECT
			ID, Contributor_ID, Contributor_Name, Cover, Title,
			Subtitle, Author, Artist, Status, Synopsis, Created
		FROM
			Fictions
		WHERE
			Contributor_ID = $1
		`,
		user_ID,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()
	var contriFictions []models.FictionModel
	for rows.Next() {
		fiction := models.FictionModel{}
		if err := rows.Scan(
			&fiction.ID,
			&fiction.Contributor_ID,
			&fiction.Contributor_Name,
			&fiction.Cover,
			&fiction.Title,
			&fiction.Subtitle,
			&fiction.Author,
			&fiction.Artist,
			&fiction.Status,
			&fiction.Synopsis,
			&fiction.Created,
		); err != nil {
			return nil, err
		}

		fictionIDStr := strconv.Itoa(fiction.ID)
		chapters, err := GetAllChapters(fictionIDStr)
		if err != nil {
			return nil, err
		}

		fiction.Chapters = chapters
		contriFictions = append(contriFictions, fiction)
	}

	return contriFictions, nil
}

func GetFavFictions(user_ID int) ([]models.FictionModel, error) {
	rows, err := db.DB.Query(
		`
		SELECT
			F.ID, F.Contributor_ID, F.Contributor_Name, F.Cover, F.Title,
			F.Subtitle, F.Author, F.Artist, F.Status, F.Synopsis, F.Created
		FROM 
			UserFavoriteFiction UF
		JOIN
			Fictions F ON UF.Fiction_ID = F.ID
		WHERE
			UF.User_ID = $1
		`,
		user_ID,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()
	var favFictions []models.FictionModel
	for rows.Next() {
		fiction := models.FictionModel{}
		if err := rows.Scan(
			&fiction.ID,
			&fiction.Contributor_ID,
			&fiction.Contributor_Name,
			&fiction.Cover,
			&fiction.Title,
			&fiction.Subtitle,
			&fiction.Author,
			&fiction.Artist,
			&fiction.Status,
			&fiction.Synopsis,
			&fiction.Created,
		); err != nil {
			return nil, err
		}

		fictionIDStr := strconv.Itoa(fiction.ID)
		chapters, err := GetAllChapters(fictionIDStr)
		if err != nil {
			return nil, err
		}

		fiction.Chapters = chapters
		favFictions = append(favFictions, fiction)
	}

	return favFictions, nil
}

func AddFavoriteFiction(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to favorite a fiction."})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")

	_, errFav := db.DB.Exec(
		`
		INSERT INTO UserFavoriteFiction (User_ID, Fiction_ID) 
		VALUES ($1, $2)
		`,
		IDToDB,
		fictionID,
	)

	if errFav != nil {
		// Handle PostgreSQL-specific error for duplicate entry
		if pqErr, ok := errFav.(*pq.Error); ok {
			if pqErr.Code == "23505" { // 23505: Unique violation
				ctx.IndentedJSON(http.StatusConflict, gin.H{"is_favorited": true, "Error": "Fiction is already in your favorites"})
				return
			}
		}

		// Handle other database errors
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"is_favorited": false, "Error": "Failed to add fiction to favorites"})
		return
	}

	ctx.IndentedJSON(http.StatusCreated, gin.H{"is_favorited": true, "Message": "Fiction added to favorites"})
}

func CheckFavoriteFiction(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in first"})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")

	var isFavorited bool
	errCheck := db.DB.QueryRow(
		`
		SELECT EXISTS (
			SELECT 
				1
			FROM
				UserFavoriteFiction
			WHERE
				User_ID = $1 AND Fiction_ID = $2
		)
		`,
		IDToDB,
		fictionID,
	).Scan(
		&isFavorited,
	)

	if errCheck != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to check favorite status"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"is_favorited": isFavorited})
}

func RemoveFavoriteFiction(ctx *gin.Context, store *sessions.CookieStore) {
	session, err := store.Get(ctx.Request, "fictsu-session")
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to remove a favorite."})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")

	result, err := db.DB.Exec(
		`
		DELETE FROM
			UserFavoriteFiction
		WHERE
			User_ID = $1 AND Fiction_ID = $2
		`,
		IDToDB,
		fictionID,
	)

	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"is_favorited": true, "Error": "Failed to remove fiction from favorites"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.IndentedJSON(http.StatusNotFound, gin.H{"is_favorited": false, "Error": "Fiction not found in your favorites"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"is_favorited": false, "Message": "Fiction removed from favorites"})
}
