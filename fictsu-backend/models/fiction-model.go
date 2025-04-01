package models

import (
	"time"
)

type Status string

const (
	Completed 	Status = "Completed"
	Ongoing   	Status = "Ongoing"
	Hiatus		Status = "Hiatus"
	Dropped		Status = "Dropped"
)

type FictionForm struct {
	ID               int       `form:"id"`
	Contributor_ID   int       `form:"contributor_id"`
	Contributor_Name string    `form:"contributor_name"`
	Title            string    `form:"title"`
	Subtitle         string    `form:"subtitle"`
	Author           string    `form:"author"`
	Artist           string    `form:"artist"`
	Status           Status    `form:"status"`
	Synopsis         string    `form:"synopsis"`
	Created          time.Time `form:"created"`
}

type FictionModel struct {
	ID               int            `json:"id"`
	Contributor_ID   int            `json:"contributor_id"`
	Contributor_Name string         `json:"contributor_name"`
	Cover            string         `json:"cover"`
	Title            string         `json:"title"`
	Subtitle         string         `json:"subtitle"`
	Author           string         `json:"author"`
	Artist           string         `json:"artist"`
	Status           Status         `json:"status"`
	Synopsis         string         `json:"synopsis"`
	Genres           []GenreModel   `json:"genres"`
	Chapters         []ChapterModel `json:"chapters"`
	Created          time.Time      `json:"created"`
}

type GenreModel struct {
	ID         int    `json:"id"`
	Genre_Name string `json:"genre_name"`
}
