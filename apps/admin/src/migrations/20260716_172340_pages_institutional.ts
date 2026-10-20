import { sql } from '@payloadcms/db-postgres'
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_values_items_icon_key" AS ENUM('ethics', 'partnership', 'excellence', 'innovation', 'customer', 'results');
  CREATE TYPE "public"."enum__pages_v_blocks_values_items_icon_key" AS ENUM('ethics', 'partnership', 'excellence', 'innovation', 'customer', 'results');
  CREATE TABLE "pages_blocks_institutional_intro_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_institutional_intro" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_mission_vision" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mission_title" varchar,
  	"mission_body" varchar,
  	"vision_title" varchar,
  	"vision_body" varchar,
  	"vision_year" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_key" "enum_pages_blocks_values_items_icon_key"
  );
  
  CREATE TABLE "pages_blocks_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_institutional_intro_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_institutional_intro" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_mission_vision" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"mission_title" varchar,
  	"mission_body" varchar,
  	"vision_title" varchar,
  	"vision_body" varchar,
  	"vision_year" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_key" "enum__pages_v_blocks_values_items_icon_key",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_institutional_intro_highlights" ADD CONSTRAINT "pages_blocks_institutional_intro_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_institutional_intro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_institutional_intro" ADD CONSTRAINT "pages_blocks_institutional_intro_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_mission_vision" ADD CONSTRAINT "pages_blocks_mission_vision_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values_items" ADD CONSTRAINT "pages_blocks_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_values" ADD CONSTRAINT "pages_blocks_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_institutional_intro_highlights" ADD CONSTRAINT "_pages_v_blocks_institutional_intro_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_institutional_intro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_institutional_intro" ADD CONSTRAINT "_pages_v_blocks_institutional_intro_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_mission_vision" ADD CONSTRAINT "_pages_v_blocks_mission_vision_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values_items" ADD CONSTRAINT "_pages_v_blocks_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_values" ADD CONSTRAINT "_pages_v_blocks_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_institutional_intro_highlights_order_idx" ON "pages_blocks_institutional_intro_highlights" USING btree ("_order");
  CREATE INDEX "pages_blocks_institutional_intro_highlights_parent_id_idx" ON "pages_blocks_institutional_intro_highlights" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_institutional_intro_order_idx" ON "pages_blocks_institutional_intro" USING btree ("_order");
  CREATE INDEX "pages_blocks_institutional_intro_parent_id_idx" ON "pages_blocks_institutional_intro" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_institutional_intro_path_idx" ON "pages_blocks_institutional_intro" USING btree ("_path");
  CREATE INDEX "pages_blocks_mission_vision_order_idx" ON "pages_blocks_mission_vision" USING btree ("_order");
  CREATE INDEX "pages_blocks_mission_vision_parent_id_idx" ON "pages_blocks_mission_vision" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_mission_vision_path_idx" ON "pages_blocks_mission_vision" USING btree ("_path");
  CREATE INDEX "pages_blocks_values_items_order_idx" ON "pages_blocks_values_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_values_items_parent_id_idx" ON "pages_blocks_values_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_values_order_idx" ON "pages_blocks_values" USING btree ("_order");
  CREATE INDEX "pages_blocks_values_parent_id_idx" ON "pages_blocks_values" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_values_path_idx" ON "pages_blocks_values" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_institutional_intro_highlights_order_idx" ON "_pages_v_blocks_institutional_intro_highlights" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_institutional_intro_highlights_parent_id_idx" ON "_pages_v_blocks_institutional_intro_highlights" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_institutional_intro_order_idx" ON "_pages_v_blocks_institutional_intro" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_institutional_intro_parent_id_idx" ON "_pages_v_blocks_institutional_intro" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_institutional_intro_path_idx" ON "_pages_v_blocks_institutional_intro" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_mission_vision_order_idx" ON "_pages_v_blocks_mission_vision" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_mission_vision_parent_id_idx" ON "_pages_v_blocks_mission_vision" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_mission_vision_path_idx" ON "_pages_v_blocks_mission_vision" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_values_items_order_idx" ON "_pages_v_blocks_values_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_values_items_parent_id_idx" ON "_pages_v_blocks_values_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_values_order_idx" ON "_pages_v_blocks_values" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_values_parent_id_idx" ON "_pages_v_blocks_values" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_values_path_idx" ON "_pages_v_blocks_values" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_institutional_intro_highlights" CASCADE;
  DROP TABLE "pages_blocks_institutional_intro" CASCADE;
  DROP TABLE "pages_blocks_mission_vision" CASCADE;
  DROP TABLE "pages_blocks_values_items" CASCADE;
  DROP TABLE "pages_blocks_values" CASCADE;
  DROP TABLE "_pages_v_blocks_institutional_intro_highlights" CASCADE;
  DROP TABLE "_pages_v_blocks_institutional_intro" CASCADE;
  DROP TABLE "_pages_v_blocks_mission_vision" CASCADE;
  DROP TABLE "_pages_v_blocks_values_items" CASCADE;
  DROP TABLE "_pages_v_blocks_values" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_values_items_icon_key";
  DROP TYPE "public"."enum__pages_v_blocks_values_items_icon_key";`)
}
