#!/usr/bin/env python3
"""
Fix Terraform syntax errors in main.tf
"""

def fix_terraform_file():
    with open('terraform/main.tf', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix quoted argument names
    fixes = [
        ('"container_image" =', 'container_image ='),
        ('"gpu_zonal_redundancy_disabled" =', 'gpu_zonal_redundancy_disabled ='),
        ('"service_account_project_roles" =', 'service_account_project_roles ='),
        ('"ingress" =', 'ingress ='),
        ('"vpc_access" =', 'vpc_access ='),
        ('"cloud_run_deletion_protection" =', 'cloud_run_deletion_protection ='),
        ('"enable_prometheus_sidecar" =', 'enable_prometheus_sidecar ='),
        ('"volumes" =', 'volumes ='),
        ('"service_scaling" =', 'service_scaling ='),
        ('"template_scaling" =', 'template_scaling ='),
        ('"env_secret_vars" =', 'env_secret_vars ='),
        ('"depends_on" =', 'depends_on ='),
        ('"automatic_replication" =', 'automatic_replication ='),
        ('"kms_key_name" =', 'kms_key_name ='),
        ('"secret_data" =', 'secret_data ='),
        ('"source" =', 'source ='),
        ('"project_id" =', 'project_id ='),
        ('"name" =', 'name ='),
        ('"activate_apis" =', 'activate_apis ='),
        ('"push_subscriptions" =', 'push_subscriptions ='),
        ('"pull_subscriptions" =', 'pull_subscriptions ='),
        ('"service_name" =', 'service_name ='),
        ('"location" =', 'location ='),
        ('"service_account" =', 'service_account ='),
        ('"topic" =', 'topic ='),
        ('"memory_size_gb" =', 'memory_size_gb ='),
        ('"redis_version" =', 'redis_version ='),
        ('"connect_mode" =', 'connect_mode ='),
        ('"read_replicas_mode" =', 'read_replicas_mode ='),
        ('"replica_count" =', 'replica_count ='),
        ('"auth_enabled" =', 'auth_enabled ='),
        ('"transit_encryption_mode" =', 'transit_encryption_mode ='),
        ('"customer_managed_key" =', 'customer_managed_key ='),
        ('"persistence_config" =', 'persistence_config ='),
        ('"persistence_mode" =', 'persistence_mode ='),
        ('"rdb_snapshot_period" =', 'rdb_snapshot_period ='),
        ('"cluster_id" =', 'cluster_id ='),
        ('"cluster_initial_user" =', 'cluster_initial_user ='),
        ('"password" =', 'password ='),
        ('"cluster_encryption_key_name" =', 'cluster_encryption_key_name ='),
        ('"automated_backup_policy" =', 'automated_backup_policy ='),
        ('"enabled" =', 'enabled ='),
        ('"time_based_retention_count" =', 'time_based_retention_count ='),
        ('"primary_instance" =', 'primary_instance ='),
        ('"instance_id" =', 'instance_id ='),
        ('"cluster_type" =', 'cluster_type ='),
        ('"primary_cluster_name" =', 'primary_cluster_name ='),
        ('"create_address" =', 'create_address ='),
        ('"url_map_input" =', 'url_map_input ='),
        ('"ssl" =', 'ssl ='),
        ('"managed_ssl_certificate_domains" =', 'managed_ssl_certificate_domains ='),
        ('"load_balancing_scheme" =', 'load_balancing_scheme ='),
        ('"protocol" =', 'protocol ='),
        ('"enable_cdn" =', 'enable_cdn ='),
        ('"serverless_neg_backends" =', 'serverless_neg_backends ='),
        ('"security_policy" =', 'security_policy ='),
        ('"zones" =', 'zones ='),
        ('"autoscaling_config" =', 'autoscaling_config ='),
        ('"cpu_target" =', 'cpu_target ='),
        ('"max_nodes" =', 'max_nodes ='),
        ('"min_nodes" =', 'min_nodes ='),
        ('"zone" =', 'zone ='),
        ('"tables" =', 'tables ='),
        ('"table_name" =', 'table_name ='),
        ('"description" =', 'description ='),
        ('"dataset_id" =', 'dataset_id ='),
        ('"encryption_key" =', 'encryption_key ='),
        ('"schema" =', 'schema ='),
        ('"table_id" =', 'table_id ='),
        ('"service_labels" =', 'service_labels ='),
        ('"vertex_ai_apis_vertex-ai" =', 'vertex_ai_apis_vertex-ai ='),
        ('"application_id" =', 'application_id ='),
        ('"service_uris" =', 'service_uris ='),
    ]

    for old, new in fixes:
        content = content.replace(old, new)

    with open('terraform/main.tf', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Terraform file fixed successfully!")

if __name__ == "__main__":
    fix_terraform_file()
