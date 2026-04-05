import { StyleSheet, Platform } from 'react-native';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  mushroomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardContent: {
    flex: 1,
  },
  mushroomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  mushroomScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 2,
  },
  toxicityLabel: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
  },
  descriptionPreview: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  arrowIcon: {
    fontSize: 20,
    color: '#ccc',
  },
  warningBox: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 5,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});