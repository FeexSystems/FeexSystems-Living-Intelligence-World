# ============================================================================
# FeexSystems Production Infrastructure (Cloud SQL, Memorystore, etc.)
# ============================================================================
# This Terraform configuration provisions production infrastructure:
# - Cloud SQL PostgreSQL
# - Memorystore Redis
# - VPC Connectors
# - Service Accounts
# - IAM Roles
# ============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ============================================================================
# VARIABLES
# ============================================================================

variable "project_id" {
  type        = string
  default     = "feexsystems-prod-508304"
  description = "The GCP / Firebase Project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "Primary GCP Region"
}

variable "database_tier" {
  type        = string
  default     = "db-f1-micro"
  description = "Cloud SQL instance tier"
}

variable "database_version" {
  type        = string
  default     = "POSTGRES_15"
  description = "PostgreSQL version"
}

variable "redis_tier" {
  type        = string
  default     = "STANDARD-1"
  description = "Memorystore Redis tier"
}

variable "redis_size" {
  type        = number
  default     = 1
  description = "Memorystore Redis size in GB"
}

variable "database_password" {
  type        = string
  description = "Cloud SQL database password (use terraform.tfvars or environment variable)"
  sensitive   = true
}

# ============================================================================
# CLOUD SQL POSTGRESQL
# ============================================================================

# Cloud SQL Instance
resource "google_sql_database_instance" "feexsystems" {
  name             = "feexsystems-db"
  database_version = var.database_version
  region           = var.region

  settings {
    tier              = var.database_tier
    availability_type = "REGIONAL"
    disk_autoresize   = true
    disk_size         = 10
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      location           = "us-central1"
      transaction_log_retention_days = 7
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = google_compute_network.feexsystems_vpc.id
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = true
}

# Cloud SQL Database
resource "google_sql_database" "feexsystems" {
  name     = "feexsystems_db"
  instance = google_sql_database_instance.feexsystems.name
}

# Cloud SQL User
resource "google_sql_user" "feexsystems" {
  name     = "feexsystems"
  instance = google_sql_database_instance.feexsystems.name
  password = var.database_password
}

# ============================================================================
# MEMORYSTORE REDIS
# ============================================================================

resource "google_redis_instance" "feexsystems" {
  name           = "feexsystems-redis"
  tier           = var.redis_tier
  memory_size_gb = var.redis_size
  region         = var.region

  location_id             = "${var.region}-a"
  redis_version           = "7_0"
  display_name            = "FeexSystems Redis Cache"
  auth_enabled            = true
  transit_encryption_mode = "TRANSIT_ENCRYPTION"

  reserved_ip_range = google_compute_global_address.feexsystems_redis_ip.name

  labels = {
    env = "production"
    app = "feexsystems"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time = "03:00"
    }
  }

  persistence_config {
    persistence_mode = "RDB"
    rdb_snapshot_period = "HOURLY"
  }
}

# Reserved IP Range for Redis
resource "google_compute_global_address" "feexsystems_redis_ip" {
  name          = "feexsystems-redis-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.feexsystems_vpc.id
}

# ============================================================================
# VPC NETWORK
# ============================================================================

resource "google_compute_network" "feexsystems_vpc" {
  name                    = "feexsystems-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "feexsystems_subnet" {
  name          = "feexsystems-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.feexsystems_vpc.id
}

# ============================================================================
# VPC CONNECTOR (Serverless VPC Access)
# ============================================================================

resource "google_vpc_access_connector" "feexsystems" {
  name          = "feexsystems-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.feexsystems_vpc.name
  min_instances = 2
  max_instances = 10
  machine_type  = "e2-micro"
}

# ============================================================================
# SERVICE ACCOUNTS
# ============================================================================

resource "google_service_account" "feexsystems_cloud_functions" {
  account_id   = "feexsystems-cloud-functions"
  display_name = "FeexSystems Cloud Functions Service Account"
  description  = "Service account for Firebase Cloud Functions"
}

# ============================================================================
# IAM ROLES
# ============================================================================

# Cloud Functions Service Account Roles
resource "google_project_iam_member" "cloud_functions_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "allUsers"
}

resource "google_project_iam_member" "cloud_functions_admin" {
  project = var.project_id
  role    = "roles/cloudfunctions.admin"
  member  = "serviceAccount:${google_service_account.feexsystems_cloud_functions.email}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.feexsystems_cloud_functions.email}"
}

resource "google_project_iam_member" "cloud_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.feexsystems_cloud_functions.email}"
}

resource "google_project_iam_member" "cloud_sql_user" {
  project = var.project_id
  role    = "roles/cloudsql.user"
  member  = "serviceAccount:${google_service_account.feexsystems_cloud_functions.email}"
}

resource "google_project_iam_member" "vpc_access_user" {
  project = var.project_id
  role    = "roles/vpcaccess.user"
  member  = "serviceAccount:${google_service_account.feexsystems_cloud_functions.email}"
}

# ============================================================================
# CLOUD STORAGE BUCKETS
# ============================================================================

resource "google_storage_bucket" "feexsystems_artifacts" {
  name          = "feexsystems-artifacts-prod"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      matches_prefix = "uploads/"
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "feexsystems_evidence" {
  name          = "feexsystems-evidence-artifacts"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
}

# ============================================================================
# BIGQUERY DATASET
# ============================================================================

resource "google_bigquery_dataset" "feexsystems_analytics" {
  dataset_id                  = "feexsystems_analytics"
  friendly_name               = "FeexSystems Analytics"
  description                 = "Analytics dataset for FeexSystems"
  location                    = var.region
  default_table_expiration_ms = 7776000000 # 90 days

  labels = {
    env = "production"
    app = "feexsystems"
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.feexsystems.connection_name
  description = "Cloud SQL instance connection name"
}

output "cloud_sql_instance_name" {
  value       = google_sql_database_instance.feexsystems.name
  description = "Cloud SQL instance name"
}

output "redis_host" {
  value       = google_redis_instance.feexsystems.host
  description = "Memorystore Redis host"
}

output "redis_port" {
  value       = google_redis_instance.feexsystems.port
  description = "Memorystore Redis port"
}

output "vpc_connector_id" {
  value       = google_vpc_access_connector.feexsystems.id
  description = "VPC Connector ID"
}

output "service_account_cloud_functions" {
  value       = google_service_account.feexsystems_cloud_functions.email
  description = "Cloud Functions service account email"
}

output "storage_bucket_artifacts" {
  value       = google_storage_bucket.feexsystems_artifacts.name
  description = "Cloud Storage bucket for artifacts"
}

output "storage_bucket_evidence" {
  value       = google_storage_bucket.feexsystems_evidence.name
  description = "Cloud Storage bucket for evidence artifacts"
}

output "bigquery_dataset_id" {
  value       = google_bigquery_dataset.feexsystems_analytics.dataset_id
  description = "BigQuery dataset ID"
}
