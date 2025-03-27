package handlers

import (
	"fmt"

	db "github.com/Fictsu/Fictsu/database"
	models "github.com/Fictsu/Fictsu/models"
)

func GetAllGenres(ficionID string) ([]models.GenreModel, error) {
	rows, err := db.DB.Query(
		`
		SELECT
			ID, Genre_Name FROM Genres
		JOIN
			AssignGenretoFiction
		ON
			ID = Genre_ID
		WHERE
			Fiction_ID = $1
		ORDER BY ID
		`,
		ficionID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve genres")
	}

	defer rows.Close()
	genres := []models.GenreModel{}
	for rows.Next() {
		genre := models.GenreModel{}
		if err := rows.Scan(
			&genre.ID,
			&genre.Genre_Name,
		); err != nil {
			return nil, fmt.Errorf("failed to process genre data")
		}

		genres = append(genres, genre)
	}

	return genres, nil
}
