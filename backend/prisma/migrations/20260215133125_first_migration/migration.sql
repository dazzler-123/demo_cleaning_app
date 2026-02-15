-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('super_admin', 'admin', 'agent') NOT NULL DEFAULT 'admin',
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agents` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `skills` TEXT NOT NULL,
    `availability` ENUM('available', 'busy', 'off_duty') NOT NULL DEFAULT 'available',
    `dailyCapacity` INTEGER NOT NULL DEFAULT 5,
    `experience` TEXT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `agents_userId_key`(`userId`),
    INDEX `agents_availability_status_idx`(`availability`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `client_company_name` VARCHAR(255) NOT NULL,
    `client_contact_person` VARCHAR(255) NOT NULL,
    `client_phone` VARCHAR(20) NULL,
    `client_email` VARCHAR(255) NULL,
    `location_address` TEXT NULL,
    `location_city` VARCHAR(100) NOT NULL,
    `location_state` VARCHAR(100) NULL,
    `location_pincode` VARCHAR(20) NULL,
    `location_lat` DOUBLE NULL,
    `location_lng` DOUBLE NULL,
    `cleaning_type` VARCHAR(100) NOT NULL,
    `cleaning_category` VARCHAR(100) NOT NULL,
    `area_size` VARCHAR(50) NULL,
    `rooms` INTEGER NULL,
    `washrooms` INTEGER NULL,
    `floor_type` VARCHAR(50) NULL,
    `frequency` VARCHAR(50) NULL,
    `resources_materials` TEXT NULL,
    `resources_machines` TEXT NULL,
    `resources_safety_gear` TEXT NULL,
    `resources_power_available` BOOLEAN NULL DEFAULT false,
    `resources_water_available` BOOLEAN NULL DEFAULT false,
    `images` TEXT NOT NULL,
    `slaPriority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `leadType` ENUM('facebook', 'instagram', 'google', 'website', 'referral', 'walk_in', 'phone_call', 'email', 'other') NULL,
    `status` ENUM('created', 'in_progress', 'confirm', 'follow_up', 'completed', 'cancelled', 'draft') NOT NULL DEFAULT 'created',
    `scheduleStatus` ENUM('not_scheduled', 'scheduled') NOT NULL DEFAULT 'not_scheduled',
    `assignmentStatus` ENUM('not_assigned', 'assigned') NOT NULL DEFAULT 'not_assigned',
    `quoted_amount` DECIMAL(10, 2) NULL,
    `confirmed_amount` DECIMAL(10, 2) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leads_client_company_name_idx`(`client_company_name`),
    INDEX `leads_status_idx`(`status`),
    INDEX `leads_scheduleStatus_assignmentStatus_idx`(`scheduleStatus`, `assignmentStatus`),
    INDEX `leads_createdBy_idx`(`createdBy`),
    INDEX `leads_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedules` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `time_slot` VARCHAR(50) NOT NULL,
    `duration` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `schedules_leadId_idx`(`leadId`),
    INDEX `schedules_date_time_slot_idx`(`date`, `time_slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignments` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `schedule_id` VARCHAR(191) NOT NULL,
    `agent_id` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold') NOT NULL DEFAULT 'pending',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `assigned_by` VARCHAR(191) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `completion_images` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assignments_leadId_idx`(`leadId`),
    INDEX `assignments_agent_id_status_idx`(`agent_id`, `status`),
    INDEX `assignments_schedule_id_idx`(`schedule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource` VARCHAR(100) NOT NULL,
    `resource_id` VARCHAR(255) NULL,
    `details` TEXT NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_idx`(`user_id`),
    INDEX `audit_logs_resource_resource_id_idx`(`resource`, `resource_id`),
    INDEX `audit_logs_created_at_idx`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_logs` (
    `id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NOT NULL,
    `from_status` ENUM('pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold') NOT NULL,
    `to_status` ENUM('pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold') NOT NULL,
    `changed_by` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_logs_assignment_id_idx`(`assignment_id`),
    INDEX `task_logs_created_at_idx`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `agents` ADD CONSTRAINT `agents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_logs` ADD CONSTRAINT `task_logs_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_logs` ADD CONSTRAINT `task_logs_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
