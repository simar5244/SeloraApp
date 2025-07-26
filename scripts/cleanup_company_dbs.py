#!/usr/bin/env python3
"""
MongoDB Database Cleanup Script

This script removes all databases that start with 'company_' except for the specified databases to keep.
"""
import os
import pymongo
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables - prioritize .env.local over .env
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Databases to exclude from deletion (include both original and lowercase versions for case-insensitive matching)
EXCLUDED_DATABASES = {
    # Original case
    'company_9JXwpH8g',
    'company_Ry0iwBpw',
    'company_PYAt1tBz',
    # Lowercase versions
    'company_9jxwph8g',
    'company_ry0iwbpw',
    'company_pyatt1tbz',
    'company_pyat1tbz'
}

def get_mongodb_connection():
    """Get MongoDB connection from environment variables."""
    mongo_uri = os.getenv('MONGODB_URI')
    if not mongo_uri:
        mongo_uri = os.getenv('MONGODB_URI_BASE')
    if not mongo_uri:
        raise ValueError("MongoDB connection URI not found in environment variables")
    
    # Ensure the URI ends with a slash for proper database name parsing
    if not mongo_uri.endswith('/'):
        mongo_uri += '/'
        
    return MongoClient(mongo_uri)

def get_company_databases(client):
    """Get all database names that start with 'company_' or contain 'company'."""
    try:
        all_dbs = client.list_database_names()
        company_dbs = []
        
        for db in all_dbs:
            # Skip system databases and excluded databases
            if db in ['admin', 'local', 'config'] or db in EXCLUDED_DATABASES:
                print(f"Skipping excluded or system database: {db}")
                continue
                
            # Check if database name matches our patterns
            if db.startswith('company_') or 'company' in db.lower():
                company_dbs.append(db)
                
        return company_dbs
    except PyMongoError as e:
        print(f"Error listing databases: {e}")
        return []

def delete_databases(client, db_names):
    """Delete the specified databases."""
    for db_name in db_names:
        try:
            print(f"Dropping database: {db_name}")
            client.drop_database(db_name)
            print(f"Successfully dropped database: {db_name}")
        except PyMongoError as e:
            print(f"Error dropping database {db_name}: {e}")

def main():
    """Main function to execute the cleanup process."""
    print("Starting MongoDB cleanup process...")
    print(f"Excluding databases: {', '.join(EXCLUDED_DATABASES)}")
    
    try:
        # Connect to MongoDB
        client = get_mongodb_connection()
        print("Connected to MongoDB")
        
        # Get list of company databases to delete
        dbs_to_delete = get_company_databases(client)
        
        if not dbs_to_delete:
            print("No company databases found to delete.")
            return
            
        print(f"Found {len(dbs_to_delete)} company databases to delete:")
        for db in dbs_to_delete:
            print(f"- {db}")
            
        # Ask for confirmation
        confirm = input("\nDo you want to proceed with deleting these databases? (yes/NO): ").strip().lower()
        if confirm != 'yes':
            print("Operation cancelled.")
            return
            
        # Delete the databases
        delete_databases(client, dbs_to_delete)
        print("\nCleanup completed successfully!")
        
    except PyMongoError as e:
        print(f"MongoDB error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        # Close the connection
        if 'client' in locals():
            client.close()
            print("Disconnected from MongoDB")

if __name__ == "__main__":
    main()
