package handlers

import (
	"fmt"
	"time"
	"strings"
	"strconv"
	"net/http"
	"database/sql"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"

	db "github.com/Fictsu/Fictsu/database"
	models "github.com/Fictsu/Fictsu/models"
)

func GetAllChapters(fictionID string) ([]models.ChapterModel, error) {
	rows, err := db.DB.Query(
		`
		SELECT
			Fiction_ID, ID, Title, Content, Created
		FROM
			Chapters
		WHERE
			Fiction_ID = $1
		ORDER BY ID
		`,
		fictionID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve chapters")
	}

	defer rows.Close()
	chapters := []models.ChapterModel{}
	for rows.Next() {
		chapter := models.ChapterModel{}
		if err := rows.Scan(
			&chapter.Fiction_ID,
			&chapter.ID,
			&chapter.Title,
			&chapter.Content,
			&chapter.Created,
		); err != nil {
			return nil, fmt.Errorf("failed to process chapter data")
		}

		chapters = append(chapters, chapter)
	}

	return chapters, nil
}

func GetChapter(ctx *gin.Context) {
	fictionID := ctx.Param("fictionID")
	chapterID := ctx.Param("chapterID")
	chapter := models.ChapterModel{}
	err := db.DB.QueryRow(
		`
		SELECT
			Fiction_ID, ID, Title, Content, Created
		FROM
			Chapters
		WHERE
			Fiction_ID = $1 AND ID = $2
		`,
		fictionID,
		chapterID,
	).Scan(
		&chapter.Fiction_ID,
		&chapter.ID,
		&chapter.Title,
		&chapter.Content,
		&chapter.Created,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Chapter not found"})
		} else {
			ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to retrieve chapter"})
		}

		return
	}

	ctx.IndentedJSON(http.StatusOK, chapter)
}

func CreateChapter(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to create a chapter."})
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
		ctx.IndentedJSON(http.StatusForbidden, gin.H{"Error": "You do not have permission to create chapters for this fiction"})
		return
	}

	chapterCreateRequest := models.ChapterModel{}
	if err := ctx.ShouldBindJSON(&chapterCreateRequest); err != nil {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "Invalid data provided for chapter creation"})
		return
	}

	var nextChapterID int
	errNextChapterID := db.DB.QueryRow(
		`
		SELECT
			COALESCE(MAX(ID), 0) + 1
		FROM
			Chapters
		WHERE
			Fiction_ID = $1
		`,
		fictionID,
	).Scan(
		&nextChapterID,
	)

	if errNextChapterID != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to calculate next chapter ID"})
        return
	}

	var newCreatedTS time.Time
	errInsert := db.DB.QueryRow(
		`
		INSERT INTO Chapters (Fiction_ID, ID, Title, Content)
		VALUES ($1, $2, $3, $4)
		RETURNING Created
		`,
		fictionID,
		nextChapterID,
		chapterCreateRequest.Title,
		chapterCreateRequest.Content,
	).Scan(
		&newCreatedTS,
	)

	if errInsert != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to create chapter"})
		return
	}

	fictionIDInt, errStr := strconv.Atoi(fictionID)
	if errStr != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to convert fiction ID to int"})
        return
	}

	chapterCreateRequest.Fiction_ID = fictionIDInt
	chapterCreateRequest.ID = nextChapterID
	chapterCreateRequest.Created = newCreatedTS
	ctx.IndentedJSON(http.StatusCreated, chapterCreateRequest)
}

func EditChapter(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to edit a chapter."})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")
	chapterID := ctx.Param("chapterID")

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
		ctx.IndentedJSON(http.StatusForbidden, gin.H{"Error": "You do not have permission to edit chapters of this fiction"})
		return
	}

	chapterUpdateRequest := models.ChapterModel{}
	if err := ctx.ShouldBindJSON(&chapterUpdateRequest); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"Error": "Invalid input data"})
		return
	}

	query := "UPDATE Chapters SET "
	params := []interface{}{}
	paramIndex := 1
	if chapterUpdateRequest.Title != "" {
		query += "Title = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, chapterUpdateRequest.Title)
		paramIndex++
	}

	if chapterUpdateRequest.Content != "" {
		query += "Content = $" + strconv.Itoa(paramIndex) + ", "
		params = append(params, chapterUpdateRequest.Content)
		paramIndex++
	}

	if len(params) == 0 {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"Error": "No valid fields provided for update"})
		return
	}

	query = strings.TrimSuffix(query, ", ") + " WHERE ID = $" + strconv.Itoa(paramIndex) + " AND Fiction_ID = $" + strconv.Itoa(paramIndex + 1)
	params = append(params, chapterID, fictionID)

	result, err := db.DB.Exec(query, params...)
	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to update chapter"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Chapter not found"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"Message": "Chapter updated successfully"})
}

func DeleteChapter(ctx *gin.Context, store *sessions.CookieStore) {
	session, errSess := store.Get(ctx.Request, "fictsu-session")
	if errSess != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to get session"})
		return
	}

	IDFromSession := session.Values["ID"]
	if IDFromSession == nil {
		ctx.IndentedJSON(http.StatusUnauthorized, gin.H{"Error": "Unauthorized. Please log in to delete chapter."})
		return
	}

	IDToDB := IDFromSession.(int)
	fictionID := ctx.Param("fictionID")
	chapterID := ctx.Param("chapterID")

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
		ctx.IndentedJSON(http.StatusForbidden, gin.H{"Error": "You do not have permission to delete chapters of this fiction"})
		return
	}

	result, err := db.DB.Exec(
		`
		DELETE FROM
			Chapters
		WHERE
			Fiction_ID = $1 AND ID = $2
		`,
		fictionID,
		chapterID,
	)

	if err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"Error": "Failed to delete chapter"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.IndentedJSON(http.StatusNotFound, gin.H{"Error": "Chapter not found"})
		return
	}

	ctx.IndentedJSON(http.StatusOK, gin.H{"Message": "Chapter deleted successfully"})
}
