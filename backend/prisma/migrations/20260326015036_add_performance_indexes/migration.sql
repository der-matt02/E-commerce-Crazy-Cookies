-- CreateIndex
CREATE INDEX `admins_isActive_idx` ON `admins`(`isActive`);

-- CreateIndex
CREATE INDEX `orders_customerEmail_idx` ON `orders`(`customerEmail`);

-- CreateIndex
CREATE INDEX `orders_status_createdAt_idx` ON `orders`(`status`, `createdAt`);
