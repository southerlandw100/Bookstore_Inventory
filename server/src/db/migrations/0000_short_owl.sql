CREATE TYPE "public"."book_status" AS ENUM('in_stock', 'sold');--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"isbn" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"genre" text NOT NULL,
	"asking_price" numeric(10, 2) NOT NULL,
	"status" "book_status" DEFAULT 'in_stock' NOT NULL,
	"date_added" timestamp DEFAULT now() NOT NULL,
	"date_sold" timestamp
);
