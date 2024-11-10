#!/usr/bin/env bash
# Install system dependencies
apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    python3-numpy

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt 