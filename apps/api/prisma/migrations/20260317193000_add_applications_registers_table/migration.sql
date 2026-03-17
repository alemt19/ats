CREATE TABLE "applications_registers" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_registers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_applications_registers_application_id"
    ON "applications_registers"("application_id");

CREATE INDEX "idx_applications_registers_created_at"
    ON "applications_registers"("created_at");

CREATE INDEX "idx_applications_registers_status"
    ON "applications_registers"("status");

ALTER TABLE "applications_registers"
    ADD CONSTRAINT "applications_registers_application_id_fkey"
    FOREIGN KEY ("application_id")
    REFERENCES "applications"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
