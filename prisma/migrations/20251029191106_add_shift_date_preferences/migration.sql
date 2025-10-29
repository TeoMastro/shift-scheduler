-- CreateEnum
CREATE TYPE "PreferenceType" AS ENUM ('DESIRED', 'UNDESIRED');

-- CreateTable
CREATE TABLE "shift_date_preference" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "preference_type" "PreferenceType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_date_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_date_preference_user_id_date_idx" ON "shift_date_preference"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_date_preference_user_id_date_preference_type_key" ON "shift_date_preference"("user_id", "date", "preference_type");

-- AddForeignKey
ALTER TABLE "shift_date_preference" ADD CONSTRAINT "shift_date_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

