"""
AWS Autopsy — Mock S3 Data Service

Simulates an AWS S3-like endpoint that validates stolen IAM credentials
and serves "sensitive" data files from a fake S3 bucket.

The attacker must use the AccessKeyId and SecretAccessKey stolen from
the metadata service to authenticate and exfiltrate data.
"""

import os
import json
import hashlib
import hmac
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)

# The credentials the attacker must present (stolen from metadata service)
VALID_ACCESS_KEY = "ASIAXPLOIT7CAPITALONEY"
VALID_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/xRfiCYEXAMPLEKEY99"

# S3 data root directory
S3_DATA_ROOT = "/opt/s3data"

# Available "buckets"
BUCKETS = {
    "capitalone-sensitive": {
        "description": "Customer PII and financial records",
        "region": "us-east-1",
        "created": "2018-06-15T10:30:00Z"
    },
    "capitalone-configs": {
        "description": "WAF configuration and deployment configs",
        "region": "us-east-1",
        "created": "2019-01-08T14:22:00Z"
    }
}


def verify_credentials():
    """
    Simplified credential verification.
    Checks for the stolen AccessKeyId in the Authorization header or query params.
    
    In real AWS, this would be SigV4 — here we simplify for the lab.
    """
    # Check Authorization header
    auth_header = request.headers.get("Authorization", "")
    if VALID_ACCESS_KEY in auth_header:
        return True

    # Check X-Access-Key custom header (simplified for lab)
    access_key = request.headers.get("X-Access-Key", "")
    secret_key = request.headers.get("X-Secret-Key", "")
    if access_key == VALID_ACCESS_KEY and secret_key == VALID_SECRET_KEY:
        return True

    # Check query parameters (simplified for lab)
    if request.args.get("AccessKeyId") == VALID_ACCESS_KEY and \
       request.args.get("SecretAccessKey") == VALID_SECRET_KEY:
        return True

    # Check AWS CLI style env var simulation via body
    body = request.get_json(silent=True) or {}
    if body.get("AccessKeyId") == VALID_ACCESS_KEY and \
       body.get("SecretAccessKey") == VALID_SECRET_KEY:
        return True

    return False


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """S3 service landing — requires authentication."""
    if not verify_credentials():
        return jsonify({
            "Error": {
                "Code": "AccessDenied",
                "Message": "Access Denied. Valid AWS credentials required.",
                "Hint": "Use the credentials obtained from the IAM role."
            }
        }), 403

    return jsonify({
        "Service": "Amazon S3 (Mock)",
        "Buckets": list(BUCKETS.keys()),
        "Message": "Authenticated successfully. List buckets or access objects.",
        "Endpoints": [
            "GET /list/<bucket>",
            "GET /get/<bucket>/<key>",
            "GET /download/<bucket>/<key>"
        ]
    })


@app.route("/list")
@app.route("/list/")
def list_all_buckets():
    """List all available S3 buckets."""
    if not verify_credentials():
        return jsonify({
            "Error": {"Code": "AccessDenied", "Message": "Access Denied"}
        }), 403

    buckets = []
    for name, info in BUCKETS.items():
        buckets.append({
            "Name": name,
            "CreationDate": info["created"],
            "Region": info["region"]
        })

    return jsonify({
        "Owner": {"DisplayName": "capitalone-prod", "ID": "abc123def456"},
        "Buckets": buckets
    })


@app.route("/list/<bucket_name>")
@app.route("/list/<bucket_name>/")
@app.route("/list/<bucket_name>/<path:prefix>")
def list_bucket_objects(bucket_name, prefix=""):
    """List objects in a bucket (like aws s3 ls)."""
    if not verify_credentials():
        return jsonify({
            "Error": {"Code": "AccessDenied", "Message": "Access Denied"}
        }), 403

    if bucket_name not in BUCKETS:
        return jsonify({
            "Error": {
                "Code": "NoSuchBucket",
                "Message": f"The specified bucket '{bucket_name}' does not exist."
            }
        }), 404

    bucket_dir = os.path.abspath(os.path.join(S3_DATA_ROOT, bucket_name))
    bucket_path = os.path.abspath(os.path.join(bucket_dir, prefix))

    if not bucket_path.startswith(bucket_dir) or not os.path.exists(bucket_path):
        return jsonify({
            "Error": {
                "Code": "NoSuchKey",
                "Message": f"The specified prefix '{prefix}' does not exist."
            }
        }), 404

    objects = []
    try:
        for entry in sorted(os.listdir(bucket_path)):
            full_path = os.path.join(bucket_path, entry)
            key = os.path.join(prefix, entry) if prefix else entry

            if os.path.isdir(full_path):
                objects.append({
                    "Key": key + "/",
                    "Type": "CommonPrefix"
                })
            else:
                stat = os.stat(full_path)
                objects.append({
                    "Key": key,
                    "Size": stat.st_size,
                    "LastModified": "2019-03-22T14:30:00Z",
                    "StorageClass": "STANDARD",
                    "ETag": hashlib.md5(key.encode()).hexdigest()
                })
    except PermissionError:
        return jsonify({
            "Error": {"Code": "AccessDenied", "Message": "Permission denied"}
        }), 403

    return jsonify({
        "Bucket": bucket_name,
        "Prefix": prefix,
        "Contents": objects,
        "KeyCount": len(objects)
    })


@app.route("/get/<bucket_name>/<path:key>")
def get_object(bucket_name, key):
    """Read a specific S3 object (like aws s3 cp)."""
    if not verify_credentials():
        return jsonify({
            "Error": {"Code": "AccessDenied", "Message": "Access Denied"}
        }), 403

    if bucket_name not in BUCKETS:
        return jsonify({
            "Error": {"Code": "NoSuchBucket", "Message": "Bucket not found"}
        }), 404

    bucket_dir = os.path.abspath(os.path.join(S3_DATA_ROOT, bucket_name))
    file_path = os.path.abspath(os.path.join(bucket_dir, key))

    if not file_path.startswith(bucket_dir) or not os.path.isfile(file_path):
        return jsonify({
            "Error": {
                "Code": "NoSuchKey",
                "Message": f"The specified key '{key}' does not exist."
            }
        }), 404

    try:
        with open(file_path, "r") as f:
            content = f.read()

        return jsonify({
            "Bucket": bucket_name,
            "Key": key,
            "ContentLength": len(content),
            "ContentType": "text/plain",
            "Body": content,
            "ETag": hashlib.md5(content.encode()).hexdigest()
        })
    except Exception as e:
        return jsonify({
            "Error": {"Code": "InternalError", "Message": str(e)}
        }), 500


@app.route("/download/<bucket_name>/<path:key>")
def download_object(bucket_name, key):
    """Download a file from S3 bucket."""
    if not verify_credentials():
        return jsonify({
            "Error": {"Code": "AccessDenied", "Message": "Access Denied"}
        }), 403

    if bucket_name not in BUCKETS:
        return jsonify({
            "Error": {"Code": "NoSuchBucket", "Message": "Bucket not found"}
        }), 404

    bucket_dir = os.path.abspath(os.path.join(S3_DATA_ROOT, bucket_name))
    file_path = os.path.abspath(os.path.join(bucket_dir, key))

    if not file_path.startswith(bucket_dir) or not os.path.isfile(file_path):
        return jsonify({
            "Error": {"Code": "NoSuchKey", "Message": "Key not found"}
        }), 404

    directory = os.path.dirname(file_path)
    filename = os.path.basename(file_path)
    return send_from_directory(directory, filename, as_attachment=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9000, debug=False)
