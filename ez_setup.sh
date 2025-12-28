#!/bin/bash

# Exit on error and treat unset variables as an error
set -euo pipefail

# Clear the terminal screen
clear

get_non_empty_input() {
    local prompt="$1"
    local input

    while true; do
        read -rp "$prompt" input
        if [[ -n "$input" ]]; then
            echo "$input"
            break
        fi
    done
}

# Print the notice message
echo "====================================================================================================="
echo ""
echo "                               EmailDelivery.com Automated Setup"
echo ""
echo "Exit at any time using Ctrl-C"
echo ""x
echo ""
echo "ATTENTION:"
echo ""
echo "If you're on Ubuntu, exit now and run our automated Docker installation:"
echo ""
echo "./install_docker_on_ubuntu.sh"
echo ""
echo "If you've run this command before on this server, it doesn't need to be run a second time." 
echo "" 


if [[ $UID -ne 0 ]]; then
    echo "====================================================================================================="
    echo ""
    echo "This script must be run as root"
    echo "Exiting the setup. Become root by running 'sudo su' and then run this script again."
    echo ""
    exit 1
fi

# ensure we were run from the correct directory
if [[ ! -f "ez_setup.sh" ]]; then
    echo "====================================================================================================="
    echo ""
    echo "This script must be run from the edcom-install directory."
    echo "Exiting the setup. Please cd into the edcom-install directory and run this script again."
    echo ""
    exit 1
fi

# chown the data/logs/postgres directory to the postgres user, this allows the system to start
# when the install archive is extracted as a regular user so tar can't chown the directory

# if this script isn't owned by root, its probably a fresh extraction which has never been installed
# before, so we can safely chown the directory to root. Doing this more than once can break the install
# as the subdirectories in data/ might have various permissions for their respective containers.
if [ $(stat -c '%U' ./ez_setup.sh) != "root" ]; then
    chown -R 0:0 .
fi
chown -R 70:70 data/logs/postgres

# Prompt the user to continue or exit
response=$(get_non_empty_input "Do you want to proceed with the automated setup? [y/n]: ")

echo ""
# Check the user's response
if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo ""
    echo "Starting the automated setup..."
    echo ""
else
    echo ""
    echo "Exiting the setup."
    echo ""
    echo ""
    exit 1
fi

echo "====================================================================================================="
echo ""
echo "           Make sure the following ports are not in use, firewalled, or blocked by SELinux:"
echo "                                80, 443, 587, 2525, and 8025"
echo ""
echo "   Now is a good time to read about Common Installation Issues before you get started:"
echo ""
echo ""
echo " https://docs.emaildelivery.com/docs/resolving-port-conflicts-with-a-second-ip"
echo ""
echo " Oracle Cloud users must read this: "
echo ""
echo " https://docs.emaildelivery.com/docs/oracle-specific-bind-cannot-assign-requested-address-8025"
echo ""
echo ""
echo "                   ChatGPT is great at helping you troubleshoot all things Linux"
echo ""
echo "====================================================================================================="
echo ""
echo ""

# Prompt the user to confirm if Docker is installed
docker_installed=$(get_non_empty_input  "Is a recent version of Docker already installed on this server (if you don't know the answer, type \"n\") [y/n]? ")

echo ""

# Check the user's response
if [[ "$docker_installed" != "y" ]]; then
    echo -e "\nDocker is required to proceed."
    echo -e "\nIf you're using Ubuntu, you can run ./install_docker_on_ubuntu.sh now to automate Docker installation"
    echo -e "\nFor other distributions, you can check out the official Docker documentation:"
    echo -e "\n- Debian: https://docs.docker.com/engine/install/debian/"
    echo -e "- CentOS: https://docs.docker.com/engine/install/centos/"
    echo -e "- Fedora: https://docs.docker.com/engine/install/fedora/"
    echo ""
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "Docker daemon is not running. Start the Docker service before running this script."
    exit 1
fi

echo "" 
echo "" 
echo "=============================================="
echo "       Loading Docker Images......            "
echo "=============================================="
echo ""
echo ""

./load_images.sh

echo "" 
echo "" 
echo "=============================================="
echo "       Docker Image Loading Complete!         "
echo "=============================================="
echo ""
echo ""


echo "" 
echo "" 
echo "=============================================="
echo "       Creating Configuration File......"
echo "=============================================="
echo ""
echo ""

# Constants
DEFAULTS_FILE="config/edcom.defaults.json"
OUTPUT_FILE="config/edcom.json"
ENV_FILE="config/edcom.env"

# Check if the defaults configuration file exists
if [[ ! -f "$DEFAULTS_FILE" ]]; then
    echo "The configuration defaults file '$DEFAULTS_FILE' doesn't exist. This file comes with the installation archive in edcom-install/config."
    exit 1
fi

echo "" 
echo "" 
echo "*** Use Ctrl-C if you need to start over"
echo ""
echo "=============================================================================================="
echo ""
echo "  Enter the IP address for this server below."
echo ""
echo "  The IP you enter here can be used only by your ESP platform and can't be shared with other"
echo "  applications. You can share a server with other applications, but they need their own IP."
echo ""
echo "           Example IP format: 1.2.3.4"
echo ""
echo "=============================================================================================="
echo ""
echo ""

ip_address=$(get_non_empty_input "Enter your ESP platform IP address: ")

ip_regex="^([0-9]{1,3}\.){3}[0-9]{1,3}$"

while ! [[ $ip_address =~ $ip_regex ]]; do
    echo "We've identified a possible error or typo in the IP you have entered."
    confirmation=$(get_non_empty_input "Please confirm your IP was entered correctly to continue [y/n]: ")
    if [[ "$confirmation" == "n" ]]; then
        ip_address=$(get_non_empty_input "Enter your ESP platform IP address: ")
    else
        break
    fi
done

echo ""
echo "=============================================================================================="
echo ""
echo "  Enter the A record you will use for this server's IP address on your DNS provider below"
echo ""
echo "           Please use a subdomain, example: esp.yourdomain.com"
echo ""
echo "=============================================================================================="
echo ""
echo ""

# Prompt user for domain name
domain_name=$(get_non_empty_input "Enter your platform domain name including subdomain (without http:// or https://): ")

# Strip 'http://' or 'https://' if provided
domain_name="${domain_name#http://}"
domain_name="${domain_name#https://}"

# Validate domain name

domain_regex="^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$"

while ! [[ $domain_name =~ $domain_regex ]]; do
    echo "We've identified a possible error or typo in the domain you have entered."
    confirmation=$(get_non_empty_input "Please confirm your domain was entered correctly to continue [y/n]: ")
    if [[ "$confirmation" == "n" ]]; then
        domain_name=$(get_non_empty_input "Enter your domain name (without http:// or https://): ")
    else
        break
    fi
    # Strip 'http://' or 'https://' if provided
    domain_name="${domain_name#http://}"
    domain_name="${domain_name#https://}"
done

# Automatically prepend 'http://' for webroot
webroot_domain="http://$domain_name"

# Make replacements and write to the output file
sed -e "s|http://your_domain_name|$webroot_domain|g" \
    -e "s|your_relay_smtp_hostname|$domain_name|g" \
    "$DEFAULTS_FILE" > "$OUTPUT_FILE"

echo "PLATFORM_IP=$ip_address" > "$ENV_FILE"

echo "" 
echo "" 
echo "*** Use Ctrl-C if you need to start over"
echo ""
echo "=============================================================================================="
echo ""
echo "                           Configuration file created:"
echo ""
echo "           IP: $ip_address"
echo ""                                                                                             
echo "           Domain: $domain_name"
echo ""
echo "=============================================================================================="
echo ""
echo ""

echo "Redis recommends we make the following system-wide optimization in /etc/sysctl.conf before bringing the platform up:"
echo ""
echo "vm.overcommit_memory=1"
echo ""
optimize=$(get_non_empty_input "If you have no objection to this or don't know what it means, just hit y [y/n]: ")
echo ""
if [[ "$optimize" == "y" || "$optimize" == "Y" ]]; then
    echo "vm.overcommit_memory=1" | tee /etc/sysctl.d/99-edcom.conf >/dev/null
    sysctl -w vm.overcommit_memory=1 >/dev/null
    sysctl -p /etc/sysctl.d/99-edcom.conf >/dev/null
else
   echo "Ok, the command was not run"
   echo ""
fi

echo ""
echo ""
echo "================================================================================================="
echo ""
echo "                           Bringing the platform up....."
echo ""
echo "                  This will initiate the first time setup process"
echo ""
echo "  If you get 'Address already in use' errors see:"
echo ""
echo "  https://docs.emaildelivery.com/docs/install/resolving-port-conflicts-with-a-second-ip"
echo ""
echo "  If you get a 'DB is unhealthy' error and you are on ARM make sure you use the right image:"
echo ""
echo "  https://docs.emaildelivery.com/docs/use-the-arm-build-for-aarch64-arm64-cpus"
echo ""
echo "  If you get a 'bind cannot assign requested address' error you are probably on Oracle Cloud or similar:"
echo ""
echo "  https://docs.emaildelivery.com/docs/oracle-specific-bind-cannot-assign-requested-address-8025"
echo ""
echo "================================================================================================="
echo ""
echo ""

docker compose up -d

echo ""
echo ""
echo ""
echo "    Your platform should now be coming online"
echo ""
echo "    The final step is creating your Administrator account"
echo ""
echo ""
echo ""

echo ""
echo "*** Use Ctrl-C if you need to start over"
echo ""
echo "================================================================================================="
echo ""
echo "                            Creating Administrator Account......."
echo ""
echo "               Use this account to login to your platform IP or domain using a web browser"
echo ""
echo "================================================================================================="
echo ""
echo ""

# Email domain validation regex
email_regex="^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$"

# Function to validate the email address
validate_email() {
    local email_to_validate="$1"
    if [[ $email_to_validate =~ $email_regex ]]; then
        return 0
    else
        echo "We've identified a possible error or typo in the email address you have entered."
        confirm_email=$(get_non_empty_input "Are you sure this is your email address? [y/n]: ")
        [[ "$confirm_email" == "y" || "$confirm_email" == "Y" ]]
    fi
}

# Function to prompt the user for details and validate
get_details() {
    echo ""
    name=$(get_non_empty_input "Enter your name: ")
    echo ""
    company_name=$(get_non_empty_input "Enter your company name: ")
    echo ""

    while true; do
        email=$(get_non_empty_input "Enter your email address: ")
        echo ""
            if validate_email "$email"; then
            break
        fi
    done

    echo -e "\nPlease confirm the details you've entered:"
    echo ""
    echo "Name: $name"
    echo ""
    echo "Company Name: $company_name"
    echo ""
    echo "Email Address: $email"

    echo ""
    confirm=$(get_non_empty_input "Are all the details correct [y/n]?: ")
    echo ""
    echo ""
    echo ""
    if [[ "$confirm" != "y" ]]; then
        get_details
    fi
}

get_details

echo ""
echo "*** You won't see your password while typing it, this is normal."
echo ""
echo ""

./create_admin.sh "$email" "$name" "$company_name"

echo ""
echo ""
echo "*** IMPORTANT:"
echo ""
echo ""
echo "           Its a good idea to verify your server came with swap space enabled"
echo ""
echo "                               Learn more at:"
echo ""
echo "    https://www.digitalocean.com/community/tutorials/how-to-add-swap-space-on-ubuntu-22-04"
echo ""
echo ""
echo "   Installation Successful! Log into your platform using the information below:"
echo ""
echo "===================================================================================================="
echo ""
echo "Domain URL: $webroot_domain"
echo ""
echo "IP URL: http://$ip_address"
echo ""
echo "Administrator Email: $email"
echo ""
echo "Enable embedded Beefree by adding a EmailDelivery.com license to config/commercial_license.key, then run ./restart.sh"
echo ""
