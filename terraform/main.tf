# FeexSystems - Firebase Hosting Custom Domain Terraform Provisioning
# Configures Dedicated SSL Certificate and Custom Domain mapping for feexsystems.codes

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  default     = "feexsystems-prod-508304"
  description = "The GCP / Firebase Project ID"
}

variable "site_id" {
  type        = string
  default     = "feexsystems-prod-508304"
  description = "The Firebase Hosting site ID"
}

variable "custom_domain" {
  type        = string
  default     = "feexsystems.codes"
  description = "The custom domain name"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "Primary GCP Region"
}

# Firebase Hosting Custom Domain Mapping (Apex Domain)
resource "google_firebase_hosting_custom_domain" "default" {
  provider        = google-beta
  project         = var.project_id
  site_id         = var.site_id
  custom_domain   = var.custom_domain
  cert_preference = "DEDICATED"
}

# Firebase Hosting Custom Domain Mapping (WWW Subdomain)
resource "google_firebase_hosting_custom_domain" "www" {
  provider        = google-beta
  project         = var.project_id
  site_id         = var.site_id
  custom_domain   = "www.${var.custom_domain}"
  cert_preference = "DEDICATED"
}

output "custom_domain_dns_updates" {
  value       = google_firebase_hosting_custom_domain.default.required_dns_updates
  description = "Required A / TXT DNS records to configure at your domain registrar"
}
