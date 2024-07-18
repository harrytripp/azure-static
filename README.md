# Azure-Based Static Website with CI/CD Pipeline
### Creating my personal website: [harrytripp.com](https://www.harrytripp.com)

## Overview

This project involves setting up a static website hosted on Azure Storage, enhanced with CDN for performance and security, and integrated with a CI/CD pipeline using GitHub Actions. Infrastructure is deployed and managed using Bicep.

## Architecture

![Architecture Diagram](https://github.com/harrytripp/azure-static/blob/92e3f68b4f9bdfe754a0793ced8da9a452546285/assets/readme/Static%20Website%20Architecture%20Diagram.png)

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
- GitHub Account with a repository to store your website content
- Visual Studio Code with GitHub Codespaces extension

### Setup Instructions

2. **Set Up GitHub Codespaces in VS Code to work directly in you website repository.**
   Follow [this guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-in-visual-studio-code) to set up Codespaces in VSCode.

3. **Create and Configure Azure Resources Using Bicep**

   - [**Azure Storage Account for Static Website**](https://github.com/harrytripp/bicep/tree/9125cf52f740baed65e04cca998316cca84b456d/Storage%20Account%20with%20Static%20Website)

     ```bicep
      // Enabling static website hosting isn't possible directly in Bicep or an ARM template,
      // so this uses a deployment script to enable the feature.
      
      @description('The location into which the resources should be deployed.')
      param location string = resourceGroup().location
      
      @description('The name of the storage account to use for site hosting.')
      param storageAccountName string = 'stor${uniqueString(resourceGroup().id)}'
      
      @description('The storage account sku name.')
      param storageSku string = 'Standard_LRS'
      
      @description('The path to the web index document.')
      param indexDocumentPath string = 'index.html'
      
      @description('The contents of the web index document.')
      param indexDocumentContents string = '<h1>Static website</h1>'
      
      @description('The path to the web error document.')
      param errorDocument404Path string = 'error.html'
      
      @description('The contents of the web error document.')
      param errorDocument404Contents string = '<h1>404 error</h1>'
      
      // Generates endpoint name from resource group id.
      var endpointName = 'endpoint-${uniqueString(resourceGroup().id)}'
      
      // Generates CDN profile name from resource group id.
      var profileName = 'cdn-${uniqueString(resourceGroup().id)}'
      
      // Gets the web endpoint of the static website.
      var storageAccountHostName = replace(replace(storageAccount.properties.primaryEndpoints.web, 'https://', ''), '/', '')
      

      ```

      ```bicep
      resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
        name: storageAccountName
        location: location
        kind: 'StorageV2'
        // Secure the storage account
        properties: { // Secure the storage account
          allowBlobPublicAccess: false
          supportsHttpsTrafficOnly: true
          minimumTlsVersion: 'TLS1_2'
          accessTier: 'Hot'
        }
        sku: {
          name: storageSku
        }
      }
      ```

      ```bicep
      resource contributorRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-05-01-preview' existing = {
        scope: subscription()
        // This is the Storage Account Contributor role, which is the minimum role permission we can give. See https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#:~:text=17d1049b-9a84-46fb-8f53-869881c3d3ab
        name: '17d1049b-9a84-46fb-8f53-869881c3d3ab'
      }
      
      resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
        name: 'DeploymentScript'
        location: location
      }
      
      resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
        scope: storageAccount
        name: guid(resourceGroup().id, managedIdentity.id, contributorRoleDefinition.id)
        properties: {
          roleDefinitionId: contributorRoleDefinition.id
          principalId: managedIdentity.properties.principalId
          principalType: 'ServicePrincipal'
        }
      }
      ```

      ```bicep
      resource deploymentScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
        name: 'deploymentScript'
        location: location
        kind: 'AzurePowerShell'
        identity: {
          type: 'UserAssigned'
          userAssignedIdentities: {
            '${managedIdentity.id}': {}
          }
        }
        dependsOn: [
          // To ensure we wait for the role assignment to be deployed before trying to access the storage account
          roleAssignment
        ]
        properties: {
          azPowerShellVersion: '7.0'
          scriptContent: loadTextContent('./scripts/enable-static-website.ps1')
          retentionInterval: 'PT4H' // 4 hours script retention post termination
          environmentVariables: [
            {
              name: 'ResourceGroupName'
              value: resourceGroup().name
            }
            {
              name: 'StorageAccountName'
              value: storageAccount.name
            }
            {
              name: 'IndexDocumentPath'
              value: indexDocumentPath
            }
            {
              name: 'IndexDocumentContents'
              value: indexDocumentContents
            }
            {
              name: 'ErrorDocument404Path'
              value: errorDocument404Path
            }
            {
              name: 'ErrorDocument404Contents'
              value: errorDocument404Contents
            }
          ]
        }
      }
      ```
   
        [Azure Storage Account Documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-host)
   
      - **Azure CDN Profile and Endpoint**
   
        ```bicep
        resource cdnProfile 'Microsoft.Cdn/profiles@2024-02-01' = {
           name: profileName
           location: 'global'
           tags: {
             displayName: profileName
           }
           sku: {
             name: 'Standard_Microsoft'
           }
         }
         
         resource endpoint 'Microsoft.Cdn/profiles/endpoints@2024-02-01' = {
           parent: cdnProfile
           name: endpointName
           location: 'global'
           tags: {
             displayName: endpointName
           }
           properties: {
             originHostHeader: storageAccountHostName
             isHttpAllowed: true
             isHttpsAllowed: true
             queryStringCachingBehavior: 'IgnoreQueryString'
             contentTypesToCompress: [
               'text/plain'
               'text/html'
               'text/css'
               'application/x-javascript'
               'text/javascript'
             ]
             isCompressionEnabled: true
             origins: [
               {
                 name: 'origin1'
                 properties: {
                   hostName: storageAccountHostName
                 }
               }
             ]
           }
         }
        ```
   
        [Azure CDN Documentation](https://learn.microsoft.com/en-us/azure/cdn/cdn-create-a-storage-account-with-cdn)
   
      - **Cloudflare DNS Configuration**
   
        Follow the steps outlined in the [Cloudflare DNS documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name?tabs=azure-portal) to configure your CNAME record to point to the Azure CDN endpoint and set SSL/TLS to "Full (Strict)".
   
   5. **Set Up Continuous Integration/Continuous Deployment (CI/CD)**
   
      - Create a GitHub Actions workflow to automate deployments of the website to Azure Blob storage:
   
        ```yaml
        name: Blob storage website CI
        
        on:
            push:
                branches: [ main ]
        
        jobs:
          build:
            runs-on: ubuntu-latest
            steps:
            - uses: actions/checkout@v3
            - uses: azure/login@v1
              with:
                  creds: ${{ secrets.AZURE_CREDENTIALS }}
        
            - name: Upload to blob storage
              uses: azure/CLI@v1
              with:
                inlineScript: |
                    az storage blob upload-batch --overwrite --account-name harrytrippcomassets --auth-mode login -d '$web' -s .
            - name: Purge CDN endpoint
              uses: azure/CLI@v1
              with:
                inlineScript: |
                   az cdn endpoint purge --content-paths  "/*" --profile-name "StaticCDN" --name "StaticEndpoint.azureedge.net" --resource-group "RG-Static-01"
        
          # Azure logout
            - name: logout
              run: |
                    az logout
              if: always()
     ```

     [GitHub Actions Documentation on Microsoft Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-static-site-github-actions?tabs=userlevel) - I used a Service Principal for the deployment credentials.

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
