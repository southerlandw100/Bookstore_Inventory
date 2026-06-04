import { pgTable, pgEnum, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const bookStatusEnum = pgEnum("book_status", ["in_stock", "sold"]);

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  isbn: text("isbn").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  genre: text("genre").notNull(),
  asking_price: numeric("asking_price", { precision: 10, scale: 2 }).notNull(),
  status: bookStatusEnum("status").notNull().default("in_stock"),
  date_added: timestamp("date_added").notNull().defaultNow(),
  date_sold: timestamp("date_sold"),
});
