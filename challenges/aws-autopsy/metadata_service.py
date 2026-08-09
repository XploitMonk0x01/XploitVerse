"""
AWS Autopsy — Mock EC2 Instance Metadata Service (IMDSv1)

Simulates the AWS EC2 Instance Metadata Service at 169.254.169.254.
Responds to IMDSv1 requests (no token required) with fake but realistic
instance metadata, including IAM security credentials.

This is the core of the Capital One attack: SSRF allows the attacker to
query this service and steal temporary IAM credentials.
"""

from flask import Flask, jsonify, request

app = Flask(__name__)

# ── Fake IAM Credentials ───────────────────────────────────────────────────
# These are the credentials the attacker needs to steal via SSRF.
# In the real breach, these were temporary STS credentials attached to the
# WAF EC2 instance's IAM role.

IAM_ROLE_NAME = "CapitalOne-WAF-Role"
FAKE_CREDENTIALS = {
    "Code": "Success",
    "LastUpdated": "2019-03-22T18:14:07Z",
    "Type": "AWS-HMAC",
    "AccessKeyId": "ASIAXPLOIT7CAPITALONEY",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/xRfiCYEXAMPLEKEY99",
    "Token": "FwoGZXIvYXdzEBYaDHqa5NeAkMR0m9NqRSLcAf3BjKAit9QJR5Hv2mSE1nEX4mPl3T0k3N",
    "Expiration": "2030-12-31T23:59:59Z"
}


# ── Metadata Routes ────────────────────────────────────────────────────────

@app.route("/")
def root():
    return "latest\n"


@app.route("/latest")
@app.route("/latest/")
def latest():
    return "meta-data\nuser-data\n"


@app.route("/latest/meta-data")
@app.route("/latest/meta-data/")
def meta_data():
    """Top-level metadata categories."""
    return (
        "ami-id\n"
        "ami-launch-index\n"
        "ami-manifest-path\n"
        "hostname\n"
        "instance-action\n"
        "instance-id\n"
        "instance-type\n"
        "local-hostname\n"
        "local-ipv4\n"
        "mac\n"
        "placement/\n"
        "profile\n"
        "public-hostname\n"
        "public-ipv4\n"
        "reservation-id\n"
        "security-groups\n"
        "iam/\n"
    )


@app.route("/latest/meta-data/ami-id")
def ami_id():
    return "ami-0abcdef1234567890\n"


@app.route("/latest/meta-data/instance-id")
def instance_id():
    return "i-0a1b2c3d4e5f67890\n"


@app.route("/latest/meta-data/instance-type")
def instance_type():
    return "t2.medium\n"


@app.route("/latest/meta-data/hostname")
@app.route("/latest/meta-data/local-hostname")
def hostname():
    return "ip-10-0-1-42.ec2.internal\n"


@app.route("/latest/meta-data/local-ipv4")
def local_ipv4():
    return "10.0.1.42\n"


@app.route("/latest/meta-data/public-ipv4")
def public_ipv4():
    return "54.210.167.204\n"


@app.route("/latest/meta-data/public-hostname")
def public_hostname():
    return "ec2-54-210-167-204.compute-1.amazonaws.com\n"


@app.route("/latest/meta-data/mac")
def mac():
    return "0e:a2:c0:ff:ee:01\n"


@app.route("/latest/meta-data/security-groups")
def security_groups():
    return "sg-waf-public\nsg-internal-services\n"


@app.route("/latest/meta-data/placement")
@app.route("/latest/meta-data/placement/")
def placement():
    return "availability-zone\nregion\n"


@app.route("/latest/meta-data/placement/availability-zone")
def availability_zone():
    return "us-east-1a\n"


@app.route("/latest/meta-data/placement/region")
def region():
    return "us-east-1\n"


@app.route("/latest/meta-data/profile")
def profile():
    return "default-hvm\n"


@app.route("/latest/meta-data/reservation-id")
def reservation_id():
    return "r-0fedcba9876543210\n"


@app.route("/latest/meta-data/ami-launch-index")
def ami_launch_index():
    return "0\n"


@app.route("/latest/meta-data/ami-manifest-path")
def ami_manifest_path():
    return "(unknown)\n"


@app.route("/latest/meta-data/instance-action")
def instance_action():
    return "none\n"


# ── IAM Credentials (The Target) ───────────────────────────────────────────

@app.route("/latest/meta-data/iam")
@app.route("/latest/meta-data/iam/")
def iam():
    return "info\nsecurity-credentials/\n"


@app.route("/latest/meta-data/iam/info")
def iam_info():
    """IAM instance profile info."""
    return jsonify({
        "Code": "Success",
        "LastUpdated": "2019-03-22T18:14:07Z",
        "InstanceProfileArn": f"arn:aws:iam::123456789012:instance-profile/{IAM_ROLE_NAME}",
        "InstanceProfileId": "AIPAXPLOIT7EXAMPLE"
    })


@app.route("/latest/meta-data/iam/security-credentials")
@app.route("/latest/meta-data/iam/security-credentials/")
def iam_security_credentials():
    """List available IAM roles."""
    return IAM_ROLE_NAME + "\n"


@app.route("/latest/meta-data/iam/security-credentials/<role_name>")
def iam_role_credentials(role_name):
    """
    THE CRITICAL ENDPOINT — Returns temporary IAM credentials.

    In the real Capital One breach, Paige Thompson (erratic) used SSRF
    to hit this exact endpoint and steal the WAF role's credentials.
    Those credentials had overpermissive S3 access, allowing her to
    exfiltrate 100+ million customer records.
    """
    if role_name != IAM_ROLE_NAME:
        return f"Role '{role_name}' not found.\nAvailable: {IAM_ROLE_NAME}\n", 404

    return jsonify(FAKE_CREDENTIALS)


# ── User Data ──────────────────────────────────────────────────────────────

@app.route("/latest/user-data")
@app.route("/latest/user-data/")
def user_data():
    """Simulated EC2 user-data script with hints."""
    return (
        "#!/bin/bash\n"
        "# CapitalOne WAF bootstrap script\n"
        "# WARNING: This instance uses IMDSv1 — migrate to IMDSv2!\n"
        "# See: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html\n"
        "\n"
        "yum update -y\n"
        "yum install -y httpd mod_security\n"
        "\n"
        "# Sync WAF rules from S3\n"
        "aws s3 sync s3://capitalone-sensitive/waf-rules/ /etc/modsecurity/rules/\n"
        "\n"
        "# NOTE: The IAM role 'CapitalOne-WAF-Role' has read access to:\n"
        "#   - s3://capitalone-sensitive/*\n"
        "#   - s3://capitalone-configs/*\n"
        "# TODO: Restrict to specific prefixes only (SEC-4821)\n"
    )


if __name__ == "__main__":
    # Run on port 8000 — entrypoint.sh will redirect 169.254.169.254 traffic here
    app.run(host="0.0.0.0", port=8000, debug=False)
