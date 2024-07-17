# Azure-Based Static Website with CI/CD Pipeline
### Creating my personal website: [harrytripp.com](https://www.harrytripp.com)

## Overview

This project involves setting up a static website hosted on Azure Storage, enhanced with CDN for performance and security, and integrated with a CI/CD pipeline using GitHub Actions. Infrastructure is deployed and managed using Bicep.

## Architecture

![Architecture Diagram](path/to/your/architecture-diagram.png)

## Features

- **Static Website**: Hosted on Azure Storage using HTML and CSS.
- **HTTPS Security**: Implemented using Azure CDN and DNS configuration with Cloudflare.
- **Infrastructure as Code (IaC)**: Automated infrastructure setup with Bicep.
- **CI/CD Pipeline**: Continuous integration and deployment set up with GitHub Actions.

## Technologies Used

- **HTML**
- **CSS**
- **Azure Storage**
- **Azure CDN**
- **Cloudflare DNS**
- **Bicep**
- **GitHub Actions**

## Getting Started

### Prerequisites

- Azure Subscription
- GitHub Account
- Visual Studio Code with GitHub Codespaces extension

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/azure-static-website.git
   cd azure-static-website
   ```

2. **Set Up GitHub Codespaces**
   Follow [this guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-in-visual-studio-code) to set up Codespaces in VSCode.

3. **Create and Configure Azure Resources Using Bicep**

   - **Azure Storage Account for Static Website**

     ```bicep
     resource storageAccount 'Microsoft.Storage/storageAccounts@2023-04-01' = {
       name: 'mystorageaccount'
       location: 'eastus'
       sku: {
         name: 'Standard_LRS'
       }
       kind: 'StorageV2'
       properties: {
         staticWebsite: {
           enabled: true
           indexDocument: 'index.html'
           errorDocument404Path: '404.html'
         }
       }
     }
     ```

     [Azure Storage Account Documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-host)

   - **Azure CDN Profile and Endpoint**

     ```bicep
     resource cdnProfile 'Microsoft.Cdn/profiles@2023-04-01' = {
       name: 'mycdnprofile'
       location: 'global'
       sku: {
         name: 'Standard_Verizon'
       }
     }

     resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2023-04-01' = {
       name: 'mycdnendpoint'
       parent: cdnProfile
       location: 'global'
       properties: {
         origins: [
           {
             name: 'storageorigin'
             hostName: '${storageAccount.name}.blob.core.windows.net'
           }
         ]
       }
     }
     ```

     [Azure CDN Documentation](https://learn.microsoft.com/en-us/azure/cdn/cdn-create-a-storage-account-with-cdn)

   - **Cloudflare DNS Configuration**

     Follow the steps outlined in the [Cloudflare DNS documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name?tabs=azure-portal) to configure your CNAME record to point to the Azure CDN endpoint and set SSL/TLS to "Full (Strict)".

4. **Deploy Static Website Content**

   - Upload your website content (e.g., `index.html`, `404.html`) to the Azure Storage account's `$web` container. You can use Azure Storage Explorer or Azure CLI for this.

     ```bash
     az storage blob upload-batch -s ./website -d '$web' --account-name mystorageaccount
     ```

     Ensure that the content types for your HTML files are correctly set to `text/html`.

5. **Set Up Continuous Integration/Continuous Deployment (CI/CD)**

   - Create GitHub Actions workflows to automate deployments:

     ```yaml
     name: CI/CD Pipeline
     on:
       push:
         branches:
           - main
     jobs:
       build-and-deploy:
         runs-on: ubuntu-latest
         steps:
           - name: Checkout code
             uses: actions/checkout@v2
           - name: Azure Login
             uses: azure/login@v1
             with:
               creds: ${{ secrets.AZURE_CREDENTIALS }}
           - name: Deploy Bicep
             run: |
               az deployment group create --resource-group myResourceGroup --template-file main.bicep
           - name: Upload Static Website Content
             run: |
               az storage blob upload-batch -s ./website -d '$web' --account-name mystorageaccount --overwrite
     ```

     [GitHub Actions Documentation](https://docs.github.com/en/actions/deployment/targeting-azure)

6. **Verify and Monitor**

   - Test your static website to ensure it is functioning correctly.
   - Regularly monitor Azure and Cloudflare for any issues.

## Additional Resources

- [Azure Static Website Hosting](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-host)
- [Azure CDN with Custom Domain](https://learn.microsoft.com/en-us/azure/cdn/cdn-storage-custom-domain-https)
- [GitHub Actions for Azure](https://docs.github.com/en/actions/deployment/targeting-azure)
- [Cloudflare SSL/TLS Settings](https://developers.cloudflare.com/ssl/)

## Conclusion

This project provided hands-on experience with Azure services, from hosting a static website to implementing a secure and efficient CI/CD pipeline. It enhanced my understanding of cloud infrastructure and automation, emphasizing best practices in deployment and security.

## Acknowledgements

- [Microsoft Learn](https://learn.microsoft.com/en-us/training/azure/)
- [GitHub Documentation](https://docs.github.com/)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
